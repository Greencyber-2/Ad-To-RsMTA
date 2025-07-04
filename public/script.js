$(document).ready(() => {
    // ----------------------------
    // تنظیمات و متغیرهای سراسری
    // ----------------------------
    const API_BASE_URL = 'https://still-base-3ac7.dns555104.workers.dev/api';
    const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/300x300/1f2937/64748b?text=بدون+تصویر';
    const ERROR_IMAGE = 'https://via.placeholder.com/300x300/1f2937/64748b?text=خطا+در+بارگذاری+تصویر';

    // ----------------------------
    // توابع کمکی عمومی
    // ----------------------------
    
    /**
     * فرمت تاریخ به صورت زمان گذشته
     */
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

    /**
     * فرمت قیمت
     */
    function formatPrice(price) {
        if (!price) return '۰ $';
        const num = parseFloat(price.replace(/,/g, ''));
        if (isNaN(num)) return price;
        return num.toLocaleString('fa-IR') + ' $';
    }

    /**
     * بررسی جدید بودن آگهی
     */
    function isAdNew(timestamp) {
        if (!timestamp) return false;
        const adDate = new Date(timestamp);
        const now = new Date();
        return (now - adDate) < 24 * 60 * 60 * 1000;
    }

    /**
     * دریافت نام دسته‌بندی
     */
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

    /**
     * پردازش تصاویر آگهی
     */
    function processImages(images) {
        try {
            images = typeof images === 'string' ? JSON.parse(images) : images || [];
            if (!Array.isArray(images)) images = [];
        } catch (e) {
            console.error('Error parsing images:', e);
            images = [];
        }
        return images.length > 0 ? images : [PLACEHOLDER_IMAGE];
    }

    // ----------------------------
    // توابع مربوط به صفحه اصلی
    // ----------------------------
    
    /**
     * نمایش پیام در مرکز صفحه
     */
    function showCenteredMessage(message, isError = false, showRetry = false) {
        $('#ads-list').html(`
            <div class="col-span-5 flex items-center justify-center h-64">
                <div class="text-center ${isError ? 'text-red-400' : 'text-gray-400'}">
                    <i class="fas ${isError ? 'fa-exclamation-triangle' : 'fa-folder-open'} text-3xl mb-3"></i>
                    <p class="text-lg">${message}</p>
                    ${showRetry ? `
                    <button id="retry-btn" class="mt-4 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                        <i class="fas fa-sync-alt ml-2"></i>
                        تلاش مجدد
                    </button>
                    ` : ''}
                </div>
            </div>
        `);
        
        if (showRetry) {
            $('#retry-btn').click(loadAds);
        }
    }

    /**
     * بارگذاری آگهی‌ها
     */
    function loadAds() {
        // فقط در صفحه اصلی اجرا شود
        if (!$('#ads-list').length) return;
        
        $('#ads-loading').removeClass('hidden');
        showCenteredMessage('در حال بارگذاری آگهی‌ها...');

        $.ajax({
            url: `${API_BASE_URL}/ads`,
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
            
            if (filteredAds.length === 0) {
                showEmptyResultsMessage();
            } else {
                displayAds(filteredAds);
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
            
            showCenteredMessage(errorMsg, true, true);
        })
        .always(() => {
            $('#ads-loading').addClass('hidden');
        });
    }

    /**
     * نمایش پیام عدم وجود نتیجه
     */
    function showEmptyResultsMessage() {
        const searchQuery = $('#search-input').val() || $('#mobile-search-input').val();
        const category = $('.category-btn.active').data('category');
        
        let emptyMessage = 'هیچ آگهی فعالی یافت نشد';
        
        if (searchQuery) {
            emptyMessage = `نتیجه‌ای برای "${searchQuery}" یافت نشد`;
        } else if (category && category !== 'all') {
            emptyMessage = `هیچ آگهی‌ای در دسته "${getCategoryName(category)}" یافت نشد`;
        }
        
        showCenteredMessage(emptyMessage);
        
        if (searchQuery || (category && category !== 'all')) {
            $('#ads-list').append(`
                <div class="text-center mt-4">
                    <button id="clear-filters-btn" class="text-sm text-green-500 hover:text-green-400">
                        پاک کردن فیلترها
                    </button>
                </div>
            `);
            
            $('#clear-filters-btn').click(() => {
                $('#search-input, #mobile-search-input').val('');
                $('.category-btn[data-category="all"]').click();
                $('#price-filter').val('');
                loadAds();
            });
        }
    }

    /**
     * فیلتر کردن آگهی‌ها
     */
    function filterAds(ads) {
        const query = $('#search-input').val()?.trim().toLowerCase() || 
                     $('#mobile-search-input').val()?.trim().toLowerCase() || '';
        const category = $('.category-btn.active').data('category') || 'all';
        const priceRange = $('#price-filter').val();

        return ads.filter(ad => {
            if (!ad.published) return false;
            
            // فیلتر دسته‌بندی
            if (category !== 'all' && ad.category !== category) return false;
            
            // فیلتر جستجو
            if (query && !(
                (ad.title && ad.title.toLowerCase().includes(query)) || 
                (ad.description && ad.description.toLowerCase().includes(query)) ||
                (ad.playerName && ad.playerName.toLowerCase().includes(query)) ||
                (ad.referral && ad.referral.toLowerCase().includes(query))
            )) return false;
            
            // فیلتر قیمت
            if (priceRange) {
                const price = parseFloat(ad.price) || 0;
                const [min, max] = priceRange.split('-').map(Number);
                if (price < min || (!isNaN(max) && price > max)) return false;
            }
            
            return true;
        });
    }

    /**
     * نمایش آگهی‌ها
     */
    function displayAds(ads) {
        $('#ads-list').empty();
        
        const adsHtml = ads.map(ad => {
            const images = processImages(ad.images);
            const mainImage = images[0];
            const timeAgo = formatTime(ad.createdAt);
            const categoryName = getCategoryName(ad.category);
            const isNew = isAdNew(ad.createdAt);
            
            return `
            <div class="group relative">
                <a href="ad-detail.html?id=${ad.id}" class="block bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-all duration-200 border border-gray-700 hover:border-gray-600 h-full flex flex-col shadow-md hover:shadow-lg">
                    <div class="aspect-square bg-gray-700 relative overflow-hidden">
                        <img src="${mainImage}" 
                             alt="${ad.title || 'آگهی'}" 
                             loading="lazy"
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                             onerror="this.src='${ERROR_IMAGE}'">
                        <div class="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                            ${categoryName}
                        </div>
                        ${isNew ? `
                        <div class="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded animate-pulse">
                            جدید
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="p-3 flex-1 flex flex-col">
                        <h3 class="text-white text-sm font-medium mb-1 line-clamp-2 leading-tight">
                            ${ad.title || 'بدون عنوان'}
                        </h3>
                        
                        <div class="mt-auto flex justify-between items-center pt-2">
                            <span class="text-green-500 font-bold text-sm whitespace-nowrap">
                                ${formatPrice(ad.price)}
                            </span>
                            <span class="text-gray-400 text-xs">${timeAgo}</span>
                        </div>
                    </div>
                    
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 pointer-events-none"></div>
                </a>
            </div>
            `;
        }).join('');
        
        $('#ads-list').html(`
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-2">
                ${adsHtml}
            </div>
        `);
    }

    // ----------------------------
    // توابع مربوط به صفحه جزئیات آگهی
    // ----------------------------
    
    /**
     * بارگذاری جزئیات آگهی
     */
    function loadAdDetail(adId) {
        // فقط در صفحه جزئیات اجرا شود
        if (!$('#ad-detail').length) return;
        
        $('#ad-loading').removeClass('hidden');
        $('#ad-detail').html(`
            <div class="flex items-center justify-center h-64">
                <div class="text-center text-gray-400">
                    <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                    <p class="text-lg">در حال بارگذاری آگهی...</p>
                </div>
            </div>
        `);

        $.ajax({
            url: `${API_BASE_URL}/ads/${adId}`,
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
                errorMsg = 'اتصال به سرور برقرار نشد';
            } else if (jqXHR.responseJSON?.error) {
                errorMsg = jqXHR.responseJSON.error;
            }
            
            $('#ad-detail').html(`
                <div class="flex items-center justify-center h-64">
                    <div class="text-center text-red-400">
                        <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                        <p class="text-lg">${errorMsg}</p>
                        <button id="retry-detail-btn" class="mt-4 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                            <i class="fas fa-sync-alt ml-2"></i>
                            تلاش مجدد
                        </button>
                        <a href="/" class="mt-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors block">
                            <i class="fas fa-home ml-2"></i>
                            بازگشت به صفحه اصلی
                        </a>
                    </div>
                </div>
            `);
            
            $('#retry-detail-btn').click(() => loadAdDetail(adId));
        })
        .always(() => {
            $('#ad-loading').addClass('hidden');
        });
    }

    /**
     * نمایش جزئیات آگهی (بدون تغییر در استایل‌های CSS موجود)
     */
    function renderAdDetail(ad) {
        const images = processImages(ad.images);
        const timeAgo = formatTime(ad.createdAt);
        const isNew = isAdNew(ad.createdAt);
        
        $('#ad-detail').html(`
            <div class="flex flex-col gap-6">
                <div class="relative rounded-xl overflow-hidden shadow-lg">
                    <div class="swiper-container">
                        <div class="swiper-wrapper">
                            ${images.map(img => `
                                <div class="swiper-slide">
                                    <img src="${img}" 
                                         alt="${ad.title || 'آگهی'}" 
                                         loading="lazy"
                                         class="w-full h-64 sm:h-96 object-cover"
                                         onerror="this.src='${ERROR_IMAGE}'">
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
        if (images.length > 1 && typeof Swiper === 'function') {
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

    // ----------------------------
    // مدیریت رویدادها
    // ----------------------------
    
    // منوی همبرگری
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
    
    // جستجوی موبایل
    $('#mobile-search-btn').click(() => {
        $('#mobile-search-container').toggleClass('hidden');
        $('#mobile-search-input').focus();
    });

    // فیلتر دسته‌بندی
    $('.category-btn').click(function () {
        $('.category-btn').removeClass('active');
        $(this).addClass('active');
        $('#mobile-menu').removeClass('show');
        $('#mobile-menu-overlay').removeClass('show');
        $('body').css('overflow', 'auto');
        loadAds();
    });

    // جستجو
    $('#search-btn, #mobile-search-submit').click((e) => {
        e.preventDefault();
        loadAds();
    });
    
    // جستجو با تاخیر
    let searchTimeout;
    $('#search-input, #mobile-search-input').on('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadAds();
        }, 500);
    });

    // فیلتر قیمت
    $('#price-filter').change(() => {
        loadAds();
    });

    // اشتراک گذاری
    $('#share-btn').click(() => {
        if (navigator.share) {
            navigator.share({
                title: document.title,
                url: window.location.href
            }).catch(err => {
                console.error('Error sharing:', err);
            });
        } else {
            alert('امکان اشتراک‌گذاری در این مرورگر وجود ندارد. لینک را کپی کنید:\n' + window.location.href);
        }
    });

    // ----------------------------
    // اجرای اولیه
    // ----------------------------
    
    // بارگذاری آگهی‌ها در صفحه اصلی
    if ($('#ads-list').length) {
        loadAds();
    }
    
    // بارگذاری جزئیات آگهی در صفحه جزئیات
    if ($('#ad-detail').length) {
        const urlParams = new URLSearchParams(window.location.search);
        const adId = urlParams.get('id');
        if (adId) loadAdDetail(adId);
    }
});