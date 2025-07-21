export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // پاسخ سریع برای درخواست‌های OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204
      });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // مسیرهای API
      if (path === '/api/ads' || path === '/api/ads/') {
        switch (method) {
          case 'GET':
            return handleGetAds(env, corsHeaders);
          case 'POST':
            return handlePostAd(request, env, corsHeaders);
          default:
            return methodNotAllowedResponse(corsHeaders);
        }
      }

      // مسیرهای مربوط به آگهی خاص
      if (path.startsWith('/api/ads/')) {
        const id = path.split('/').pop();
        
        if (!id || isNaN(id)) {
          return badRequestResponse('Invalid ad ID', corsHeaders);
        }

        switch (method) {
          case 'GET':
            return handleGetAd(id, env, corsHeaders);
          case 'PUT':
            return handleUpdateAd(id, request, env, corsHeaders);
          case 'DELETE':
            return handleDeleteAd(id, env, corsHeaders);
          default:
            return methodNotAllowedResponse(corsHeaders);
        }
      }

      // مسیر یافت نشد
      return notFoundResponse(corsHeaders);

    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse(error.message, 500, corsHeaders);
    }
  }
};

// توابع کمکی برای مدیریت درخواست‌ها
async function handleGetAds(env, corsHeaders) {
  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM ads ORDER BY createdAt DESC"
    ).all();
    
    const adsWithParsedImages = results.map(ad => ({
      ...ad,
      images: safeJsonParse(ad.images),
      published: ad.published === 1
    }));
    
    return successResponse(adsWithParsedImages, corsHeaders);
  } catch (error) {
    console.error('Failed to fetch ads:', error);
    throw new Error('Failed to retrieve ads');
  }
}

async function handlePostAd(request, env, corsHeaders) {
  let data;
  try {
    data = await request.json();
  } catch (error) {
    return badRequestResponse('Invalid JSON data', corsHeaders);
  }

  // اعتبارسنجی
  const requiredFields = ['title', 'price', 'description', 'category', 'telegramId'];
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    return badRequestResponse('Missing required fields', corsHeaders, { missingFields });
  }

  if (data.images && !Array.isArray(data.images)) {
    return badRequestResponse('Images must be an array', corsHeaders);
  }

  const id = data.id || Date.now();
  const adData = {
    id,
    title: data.title,
    price: data.price,
    description: data.description,
    category: data.category,
    images: JSON.stringify(data.images || []),
    published: data.published ? 1 : 0,
    createdAt: data.createdAt || new Date().toISOString(),
    gameId: data.gameId || null,
    playerName: data.playerName || null,
    referral: data.referral || null,
    location: data.location || null,
    details: data.details || data.description,
    telegramId: data.telegramId || null,
    type: data.type || 'normal'
  };

  try {
    const { success } = await env.DB.prepare(
      "INSERT INTO ads (id, title, price, description, category, images, published, createdAt, gameId, playerName, referral, location, details, telegramId, type) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      adData.id,
      adData.title,
      adData.price,
      adData.description,
      adData.category,
      adData.images,
      adData.published,
      adData.createdAt,
      adData.gameId,
      adData.playerName,
      adData.referral,
      adData.location,
      adData.details,
      adData.telegramId,
      adData.type
    ).run();

    if (!success) {
      throw new Error('Database operation failed');
    }

    return successResponse({ id }, corsHeaders);
  } catch (error) {
    console.error('Failed to insert ad:', error);
    throw new Error('Failed to create ad');
  }
}

async function handleGetAd(id, env, corsHeaders) {
  try {
    const ad = await env.DB.prepare(
      "SELECT * FROM ads WHERE id = ?"
    ).bind(id).first();

    if (!ad) {
      return notFoundResponse('Ad not found', corsHeaders);
    }

    return successResponse({
      ...ad,
      images: safeJsonParse(ad.images),
      published: ad.published === 1
    }, corsHeaders);
  } catch (error) {
    console.error('Failed to fetch ad:', error);
    throw new Error('Failed to retrieve ad');
  }
}

async function handleUpdateAd(id, request, env, corsHeaders) {
  let data;
  try {
    data = await request.json();
  } catch (error) {
    return badRequestResponse('Invalid JSON data', corsHeaders);
  }

  // اعتبارسنجی
  const requiredFields = ['title', 'price', 'description', 'category', 'telegramId'];
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    return badRequestResponse('Missing required fields', corsHeaders, { missingFields });
  }

  try {
    const { success } = await env.DB.prepare(
      "UPDATE ads SET title = ?, price = ?, description = ?, category = ?, images = ?, published = ?, " +
      "gameId = ?, playerName = ?, referral = ?, location = ?, details = ?, telegramId = ?, type = ? WHERE id = ?"
    ).bind(
      data.title,
      data.price,
      data.description,
      data.category,
      JSON.stringify(data.images || []),
      data.published ? 1 : 0,
      data.gameId || null,
      data.playerName || null,
      data.referral || null,
      data.location || null,
      data.details || data.description,
      data.telegramId || null,
      data.type || 'normal',
      id
    ).run();

    if (!success) {
      throw new Error('Database operation failed');
    }

    return successResponse({ id }, corsHeaders);
  } catch (error) {
    console.error('Failed to update ad:', error);
    throw new Error('Failed to update ad');
  }
}

async function handleDeleteAd(id, env, corsHeaders) {
  try {
    const { success } = await env.DB.prepare(
      "DELETE FROM ads WHERE id = ?"
    ).bind(id).run();

    if (!success) {
      throw new Error('Database operation failed');
    }

    return successResponse({ id }, corsHeaders);
  } catch (error) {
    console.error('Failed to delete ad:', error);
    throw new Error('Failed to delete ad');
  }
}

// توابع کمکی برای پاسخ‌ها
function successResponse(data, corsHeaders) {
  return new Response(JSON.stringify({
    success: true,
    data
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function badRequestResponse(message, corsHeaders, extra = {}) {
  return new Response(JSON.stringify({
    success: false,
    error: message,
    ...extra
  }), {
    status: 400,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function notFoundResponse(message = 'Endpoint not found', corsHeaders) {
  return new Response(JSON.stringify({
    success: false,
    error: message
  }), {
    status: 404,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function methodNotAllowedResponse(corsHeaders) {
  return new Response(JSON.stringify({
    success: false,
    error: 'Method not allowed'
  }), {
    status: 405,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function errorResponse(message, status = 500, corsHeaders) {
  return new Response(JSON.stringify({
    success: false,
    error: message
  }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

// تابع کمکی برای تجزیه ایمن JSON
function safeJsonParse(str) {
  try {
    return typeof str === 'string' ? JSON.parse(str) : str || [];
  } catch (e) {
    console.error('JSON parse error:', e);
    return [];
  }
}