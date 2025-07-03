$(document).ready(() => {
    // Hamburger Menu Toggle
    $('#hamburger-btn').click(() => {
        $('#mobile-menu').addClass('show');
        $('#mobile-menu-overlay').addClass('show');
        $('body').css('overflow', 'hidden');
    });
    
    $('#close-mobile-menu, #mobile-menu-overlay').click(() => {
        $('#mobile-menu').removeClass('show');
        $('#mobile-menu-overlay').removeClass('show');
        $('body').css('overflow', 'auto');
    });
    
    // Mobile Search Toggle
    $('#mobile-search-btn').click(() => {
        $('#mobile-search-container').toggleClass('hidden');
        $('#mobile-search-input').focus();
    });

    // Enhanced Ads Loading with better image handling and error management
    function loadAds() {
        $('#ads-loading').removeClass('hidden');
        $('#ads-list').html(`
            <div class="col-span-5 text-center py-8">
                <div class="inline-flex items-center gap-2 text-gray-400">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>در حال بارگذاری آگهی‌ها...</span>
                </div>
            </div>
        `);

        $.ajax({
            url: 'https://still-base-3ac7.dns555104.workers.dev/api/ads',
            method: 'GET',
            timeout: 8000,
            dataType: 'json'
        })
        .done((response) => {
            if (!response || !response.success) {
                throw new Error(response?.error || 'پاسخ نامعتبر از سرور');
            }

            const ads = response.data || [];
            
            if (!Array.isArray(ads)) {
                throw new Error('فرمت داده‌های دریافتی نامعتبر است');
            }
            
            const filteredAds = filterAds(ads);
            displayAds(filteredAds);
            
            // Handle empty results
            if (filteredAds.length === 0) {
                const searchQuery = $('#search-input').val() || $('#mobile-search-input').val();
                const category = $('.category-btn.active').data('category');
                
                let emptyMessage = 'هیچ آگهی فعالی یافت نشد';
                
                if (searchQuery) {
                    emptyMessage = `نتیجه‌ای برای "${searchQuery}" یافت نشد`;
                } else if (category && category !== 'all') {
                    emptyMessage = `هیچ آگهی‌ای در دسته "${getCategoryName(category)}" یافت نشد`;
                }
                
                $('#ads-list').append(`
                    <div class="col-span-5 text-center py-4 text-gray-400">
                        <p>${emptyMessage}</p>
                        ${searchQuery || (category && category !== 'all') ? `
                        <button id="clear-filters-btn" class="mt-2 text-sm text-green-500 hover:text-green-400">
                            پاک کردن فیلترها
                        </button>
                        ` : ''}
                    </div>
                `);
                
                $('#clear-filters-btn').click(() => {
                    $('#search-input, #mobile-search-input').val('');
                    $('.category-btn[data-category="all"]').click();
                    $('#price-filter').val('');
                    loadAds();
                });
            }
        })
        .fail((jqXHR) => {
            let errorMsg = 'خطا در دریافت آگهی‌ها';
            
            if (jqXHR.status === 0) {
                errorMsg = 'اتصال به سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.';
            } else if (jqXHR.status === 404) {
                errorMsg = 'آدرس API یافت نشد';
            } else if (jqXHR.status >= 500) {
                errorMsg = 'مشکل موقتی در سرور. لطفاً چند دقیقه دیگر تلاش کنید.';
            } else if (jqXHR.responseJSON?.error) {
                errorMsg = jqXHR.responseJSON.error;
            }
            
            $('#ads-list').html(`
                <div class="col-span-5 text-center py-8">
                    <div class="inline-flex flex-col items-center gap-3 text-red-400">
                        <i class="fas fa-exclamation-triangle text-2xl"></i>
                        <p>${errorMsg}</p>
                        <button id="retry-load-btn" class="mt-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                            <i class="fas fa-sync-alt ml-2"></i>
                            تلاش مجدد
                        </button>
                    </div>
                </div>
            `);
            
            $('#retry-load-btn').click(() => {
                loadAds();
            });
        })
        .always(() => {
            $('#ads-loading').addClass('hidden');
        });
    }

    // Enhanced Ads Filtering with better search and category handling
    function filterAds(ads) {
        const query = $('#search-input').val()?.trim().toLowerCase() || 
                     $('#mobile-search-input').val()?.trim().toLowerCase() || '';
        const category = $('.category-btn.active').data('category') || 'all';
        const priceRange = $('#price-filter').val();

        return ads.filter(ad => {
            // Basic validation
            if (!ad.published) return false;
            
            // Category filter
            const matchesCategory = category === 'all' || ad.category === category;
            if (!matchesCategory) return false;
            
            // Search query filter
            const matchesSearch = query === '' || 
                (ad.title && ad.title.toLowerCase().includes(query)) || 
                (ad.description && ad.description.toLowerCase().includes(query)) ||
                (ad.playerName && ad.playerName.toLowerCase().includes(query)) ||
                (ad.referral && ad.referral.toLowerCase().includes(query));
            if (!matchesSearch) return false;
            
            // Price range filter
            if (priceRange) {
                const price = parseFloat(ad.price) || 0;
                const [min, max] = priceRange.split('-').map(Number);
                const matchesPrice = price >= min && (isNaN(max) || price <= max);
                if (!matchesPrice) return false;
            }
            
            return true;
        });
    }

    // Optimized Ads Display with better image handling
    function displayAds(ads) {
        $('#ads-list').empty();
        
        if (ads.length === 0) {
            $('#ads-list').html(`
                <div class="col-span-5 text-center py-8 text-gray-400">
                    <i class="far fa-folder-open text-2xl mb-2"></i>
                    <p>هیچ آگهی یافت نشد</p>
                </div>
            `);
            return;
        }
        
        const adsHtml = ads.map(ad => {
            // Process images from D1 (stored as JSON string)
            let images = [];
            try {
                images = typeof ad.images === 'string' ? JSON.parse(ad.images) : ad.images || [];
                if (!Array.isArray(images)) images = [];
            } catch (e) {
                console.error('Error parsing images:', e);
                images = [];
            }
            
            const mainImage = images.length > 0 ? 
                images[0] : 'https://via.placeholder.com/300x300/1f2937/64748b?text=بدون+تصویر';
            const timeAgo = formatTime(ad.createdAt);
            const categoryName = getCategoryName(ad.category);
            const isNew = isAdNew(ad.createdAt);
            
            return `
            <div class="group relative">
                <a href="ad-detail.html?id=${ad.id}" class="block bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-all duration-200 border border-gray-700 hover:border-gray-600 h-full flex flex-col shadow-md hover:shadow-lg">
                    <!-- Image with lazy loading -->
                    <div class="aspect-square bg-gray-700 relative overflow-hidden">
                        <img src="${mainImage}" 
                             alt="${ad.title || 'آگهی'}" 
                             loading="lazy"
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                             onerror="this.src='https://via.placeholder.com/300x300/1f2937/64748b?text=خطا+در+بارگذاری+تصویر'">
                        <div class="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                            ${categoryName}
                        </div>
                        ${isNew ? `
                        <div class="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded animate-pulse">
                            جدید
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- Content -->
                    <div class="p-3 flex-1 flex flex-col">
                        <!-- Title -->
                        <h3 class="text-white text-sm font-medium mb-1 line-clamp-2 leading-tight">
                            ${ad.title || 'بدون عنوان'}
                        </h3>
                        
                        <!-- Price & Time -->
                        <div class="mt-auto flex justify-between items-center pt-2">
                            <span class="text-green-500 font-bold text-sm whitespace-nowrap">
                                ${formatPrice(ad.price)}
                            </span>
                            <span class="text-gray-400 text-xs">${timeAgo}</span>
                        </div>
                    </div>
                    
                    <!-- Hover overlay effect -->
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 pointer-events-none"></div>
                </a>
            </div>
            `;
        }).join('');
        
        $('#ads-list').append(`
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-2">
                ${adsHtml}
            </div>
        `);
    }
    
    // Helper Functions
    function formatTime(timestamp) {
        if (!timestamp) return 'نامشخص';
        
        const now = new Date();
        const adDate = new Date(timestamp);
        const diffInSeconds = Math.floor((now - adDate) / 1000);
        
        if (diffInSeconds < 60) return 'اکنون';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} دقیقه پیش`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ساعت پیش`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} روز پیش`;
        if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} ماه پیش`;
        return `${Math.floor(diffInSeconds / 31536000)} سال پیش`;
    }

    function formatPrice(price) {
        if (!price) return '۰ $';
        const num = parseFloat(price.replace(/,/g, ''));
        if (isNaN(num)) return price;
        return num.toLocaleString('fa-IR') + ' $';
    }

    function isAdNew(timestamp) {
        if (!timestamp) return false;
        const adDate = new Date(timestamp);
        const now = new Date();
        return (now - adDate) < 24 * 60 * 60 * 1000; // Less than 24 hours
    }

    function getCategoryName(category) {
        const categories = {
            'all': 'همه',
            'cars': 'خودرو',
            'motorcycles': 'موتور',
            'houses': 'املاک',
            'items': 'آیتم',
            'others': 'سایر'
        };
        return categories[category] || category;
    }

    // Category Filter
    $('.category-btn').click(function () {
        $('.category-btn').removeClass('active');
        $(this).addClass('active');
        $('#mobile-menu').removeClass('show');
        $('#mobile-menu-overlay').removeClass('show');
        $('body').css('overflow', 'auto');
        loadAds();
    });

    // Search
    $('#search-btn, #mobile-search-submit').click((e) => {
        e.preventDefault();
        loadAds();
    });
    
    // Search on input with debounce
    let searchTimeout;
    $('#search-input, #mobile-search-input').on('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadAds();
        }, 500);
    });

    // Price Filter
    $('#price-filter').change(() => {
        loadAds();
    });

    // Load Ad Details with improved error handling and image management
    const urlParams = new URLSearchParams(window.location.search);
    const adId = urlParams.get('id');
    if ($('#ad-detail').length && adId) {
        loadAdDetail(adId);
    }

    function loadAdDetail(adId) {
        $('#ad-detail').html(`
            <div class="text-center py-12">
                <div class="inline-flex items-center gap-2 text-gray-400">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>در حال بارگذاری آگهی...</span>
                </div>
            </div>
        `);

        $.ajax({
            url: `https://still-base-3ac7.dns555104.workers.dev/api/ads/${adId}`,
            method: 'GET',
            timeout: 8000,
            dataType: 'json'
        })
        .done((response) => {
            if (!response || !response.success || !response.data) {
                throw new Error(response?.error || 'آگهی یافت نشد');
            }
            renderAdDetail(response.data);
        })
        .fail((jqXHR) => {
            let errorMsg = 'خطا در بارگذاری آگهی';
            
            if (jqXHR.status === 404) {
                errorMsg = 'آگهی مورد نظر یافت نشد';
            } else if (jqXHR.status === 0) {
                errorMsg = 'اتصال به سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.';
            } else if (jqXHR.responseJSON?.error) {
                errorMsg = jqXHR.responseJSON.error;
            }
            
            $('#ad-detail').html(`
                <div class="text-center py-12">
                    <div class="inline-flex flex-col items-center gap-3 text-red-400">
                        <i class="fas fa-exclamation-triangle text-2xl"></i>
                        <p>${errorMsg}</p>
                        <button id="retry-detail-btn" class="mt-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                            <i class="fas fa-sync-alt ml-2"></i>
                            تلاش مجدد
                        </button>
                        <a href="/" class="mt-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                            <i class="fas fa-home ml-2"></i>
                            بازگشت به صفحه اصلی
                        </a>
                    </div>
                </div>
            `);
            
            $('#retry-detail-btn').click(() => {
                loadAdDetail(adId);
            });
        });
    }

    function renderAdDetail(ad) {
        // Process images from D1 (stored as JSON string)
        let images = [];
        try {
            images = typeof ad.images === 'string' ? JSON.parse(ad.images) : ad.images || [];
            if (!Array.isArray(images)) images = [];
        } catch (e) {
            console.error('Error parsing images:', e);
            images = [];
        }
        
        if (images.length === 0) {
            images.push('https://via.placeholder.com/600x400/1f2937/64748b?text=بدون+تصویر');
        }
        
        const timeAgo = formatTime(ad.createdAt);
        const isNew = isAdNew(ad.createdAt);
        
        $('#ad-detail').html(`
            <div class="flex flex-col gap-6">
                <!-- Image Gallery with lazy loading -->
                <div class="relative rounded-xl overflow-hidden shadow-lg">
                    <div class="swiper-container">
                        <div class="swiper-wrapper">
                            ${images.map(img => `
                                <div class="swiper-slide">
                                    <img src="${img}" 
                                         alt="${ad.title || 'آگهی'}" 
                                         loading="lazy"
                                         class="w-full h-64 sm:h-96 object-cover"
                                         onerror="this.src='https://via.placeholder.com/600x400/1f2937/64748b?text=خطا+در+بارگذاری+تصویر'">
                                </div>
                            `).join('')}
                        </div>
                        <div class="swiper-pagination"></div>
                        <div class="swiper-button-next"></div>
                        <div class="swiper-button-prev"></div>
                    </div>
                    <div class="absolute top-0 left-0 right-0 flex justify-between p-4">
                        ${isNew ? `
                        <div class="bg-red-500 text-white text-xs px-3 py-1 rounded-full animate-pulse">
                            جدید
                        </div>
                        ` : '<div></div>'}
                        <div class="price-badge inline-flex items-center px-4 py-2 rounded-full bg-black bg-opacity-70">
                            <span class="text-green-500 font-bold text-lg">${formatPrice(ad.price)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Ad Info -->
                <div class="flex flex-col gap-4">
                    <div>
                        <h2 class="text-2xl sm:text-3xl font-bold text-white mb-1">${ad.title || 'بدون عنوان'}</h2>
                        <div class="flex items-center text-gray-400 text-sm gap-2 flex-wrap">
                            <span class="bg-gray-700 px-2 py-1 rounded-full text-xs">${getCategoryName(ad.category)}</span>
                            <span><i class="far fa-clock ml-1"></i>${timeAgo}</span>
                            ${ad.location ? `
                            <span><i class="fas fa-map-marker-alt ml-1"></i>${ad.location}</span>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Player Info -->
                    <div class="info-box p-4 bg-gray-800 rounded-lg">
                        <h3 class="text-white font-bold mb-3 text-lg border-b border-gray-700 pb-2">اطلاعات فروشنده</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="flex items-center gap-3">
                                <div class="bg-gray-700 p-2 rounded-full">
                                    <i class="fas fa-user text-gray-400"></i>
                                </div>
                                <div>
                                    <p class="text-gray-400 text-xs">نام فروشنده</p>
                                    <p class="text-white">${ad.playerName || 'نامشخص'}</p>
                                </div>
                            </div>
                            ${ad.referral ? `
                            <div class="flex items-center gap-3">
                                <div class="bg-gray-700 p-2 rounded-full">
                                    <i class="fas fa-user-tag text-gray-400"></i>
                                </div>
                                <div>
                                    <p class="text-gray-400 text-xs">رفرال</p>
                                    <p class="text-white">${ad.referral}</p>
                                </div>
                            </div>
                            ` : ''}
                            <div class="flex items-center gap-3">
                                <div class="bg-gray-700 p-2 rounded-full">
                                    <i class="fas fa-gamepad text-gray-400"></i>
                                </div>
                                <div>
                                    <p class="text-gray-400 text-xs">شماره گیم</p>
                                    <p class="text-white">${ad.gameId || 'نامشخص'}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="bg-gray-700 p-2 rounded-full">
                                    <i class="fas fa-calendar-alt text-gray-400"></i>
                                </div>
                                <div>
                                    <p class="text-gray-400 text-xs">تاریخ ثبت</p>
                                    <p class="text-white">${ad.createdAt ? new Date(ad.createdAt).toLocaleString('fa-IR') : 'نامشخص'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Ad Description -->
                    <div class="info-box p-4 bg-gray-800 rounded-lg">
                        <h3 class="text-white font-bold mb-3 text-lg border-b border-gray-700 pb-2">توضیحات</h3>
                        <p class="text-gray-300 whitespace-pre-line leading-relaxed">${ad.description || 'بدون توضیحات'}</p>
                        ${ad.details && ad.details !== ad.description ? `
                        <div class="mt-4 pt-4 border-t border-gray-700">
                            <h4 class="text-white font-medium mb-2">جزئیات بیشتر</h4>
                            <p class="text-gray-300 whitespace-pre-line leading-relaxed">${ad.details}</p>
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- Contact Seller -->
                    <div class="sticky bottom-4 left-0 right-0 z-10">
                        <div class="bg-gray-800 rounded-full shadow-xl p-2 max-w-md mx-auto">
                            <button class="contact-btn bg-gradient-to-r from-green-500 to-green-600 text-white w-full px-6 py-3 rounded-full font-bold hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center">
                                <i class="fas fa-phone-alt ml-2"></i>
                                تماس با فروشنده
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        // Initialize Swiper if multiple images exist
        if (images.length > 1) {
            new Swiper('.swiper-container', {
                loop: true,
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
            });
        } else {
            $('.swiper-pagination, .swiper-button-next, .swiper-button-prev').hide();
        }
        
        // Contact button click handler
        $('.contact-btn').click(() => {
            const contactInfo = [
                ad.playerName && `نام: ${ad.playerName}`,
                ad.gameId && `شماره گیم: ${ad.gameId}`,
                ad.referral && `رفرال: ${ad.referral}`
            ].filter(Boolean).join('\n');
            
            alert(`اطلاعات تماس:\n${contactInfo || 'اطلاعات تماس موجود نیست'}`);
        });
    }

    // Initial load
    loadAds();
});