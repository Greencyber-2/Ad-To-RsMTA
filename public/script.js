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
     * بررسی نوع آگهی
     */
    function getAdBadge(type) {
        const badges = {
            'fast': {
                text: 'فوری',
                class: 'bg-orange-500 animate-pulse'
            },
            'vip': {
                text: 'ویژه',
                class: 'bg-purple-500 animate-pulse' // تغییر: ویژه هم چشمک می‌زند
            },
            'normal': null
        };
        return badges[type] || null;
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
        
        // جدا کردن آگهی‌های فوری و نمایش آنها در ابتدا
        const fastAds = ads.filter(ad => ad.type === 'fast');
        const otherAds = ads.filter(ad => ad.type !== 'fast');
        const sortedAds = [...fastAds, ...otherAds];
        
        const adsHtml = sortedAds.map(ad => {
            const images = processImages(ad.images);
            const mainImage = images[0];
            const timeAgo = ad.type === 'fast' ? '' : formatTime(ad.createdAt); // تغییر: برای آگهی فوری زمان نمایش داده نمی‌شود
            const categoryName = ad.type === 'fast' ? '' : getCategoryName(ad.category); // تغییر: برای آگهی فوری دسته‌بندی نمایش داده نمی‌شود
            const badge = getAdBadge(ad.type);
            const priceHtml = formatPrice(ad.price);
            
            return `
            <div class="group relative">
                <a href="ad-detail.html?id=${ad.id}" class="block bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-all duration-200 border border-gray-700 hover:border-gray-600 h-full flex flex-col shadow-md hover:shadow-lg">
                    <div class="aspect-square bg-gray-700 relative overflow-hidden">
                        <img src="${mainImage}" 
                             alt="${ad.title || 'آگهی'}" 
                             loading="lazy"
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                             onerror="this.src='${ERROR_IMAGE}'">
                        ${categoryName ? `
                        <div class="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                            ${categoryName}
                        </div>
                        ` : ''}
                        ${badge ? `
                        <div class="absolute top-2 right-2 ${badge.class} text-white text-xs px-2 py-1 rounded">
                            ${badge.text}
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="p-3 flex-1 flex flex-col">
                        <h3 class="text-white text-sm font-medium mb-1 line-clamp-2 leading-tight">
                            ${ad.title || 'بدون عنوان'}
                        </h3>
                        
                        <div class="mt-auto flex justify-between items-center pt-2">
                            <span class="text-green-500 font-bold text-sm whitespace-nowrap">
                                ${priceHtml}
                            </span>
                            ${timeAgo ? `
                            <span class="text-gray-400 text-xs">${timeAgo}</span>
                            ` : ''}
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
     * نمایش جزئیات آگهی
     */
    function renderAdDetail(ad) {
        const images = processImages(ad.images);
        const timeAgo = formatTime(ad.createdAt);
        const badge = getAdBadge(ad.type);
        
        $('#ad-detail').html(`
            <div class="flex flex-col gap-6">
                <!-- تصاویر آگهی -->
                <div class="relative rounded-xl overflow-hidden shadow-lg">
                    <div class="swiper-container">
                        <div class="swiper-wrapper">
                            ${images.map(img => `
                                <div class="swiper-slide">
                                    <img src="${img}" 
                                         alt="${ad.title || 'آگهی'}" 
                                         loading="lazy"
                                         class="w-full h-64 sm:h-96 object-cover cursor-zoom-in"
                                         onerror="this.src='${ERROR_IMAGE}'">
                                </div>
                            `).join('')}
                        </div>
                        <div class="swiper-pagination"></div>
                        <div class="swiper-button-next"></div>
                        <div class="swiper-button-prev"></div>
                    </div>
                    <div class="absolute top-0 left-0 right-0 flex justify-between p-4">
                        ${badge ? `
                        <div class="${badge.class} text-white text-sm px-3 py-1 rounded-full">
                            ${badge.text}
                        </div>
                        ` : '<div></div>'}
                        <div class="price-badge inline-flex items-center px-4 py-2 rounded-full bg-black bg-opacity-70">
                            <span class="text-green-500 font-bold text-lg">${formatPrice(ad.price)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- اطلاعات آگهی -->
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
                    
                    <!-- اطلاعات فروشنده -->
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
                            ${ad.telegramId ? `
                            <div class="flex items-center gap-3">
                                <div class="bg-gray-700 p-2 rounded-full">
                                    <i class="fab fa-telegram text-gray-400"></i>
                                </div>
                                <div>
                                    <p class="text-gray-400 text-xs">آیدی تلگرام</p>
                                    <p class="text-white">${ad.telegramId}</p>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- توضیحات آگهی -->
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
                    
                    <!-- دکمه تماس با فروشنده -->
                    <div class="sticky bottom-4 left-0 right-0 z-10">
                        <button class="contact-btn bg-gradient-to-r from-green-500 to-green-600 text-white w-full px-6 py-3 rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center">
                            <i class="fas fa-phone-alt ml-2"></i>
                            تماس با فروشنده
                        </button>
                    </div>
                </div>
                
                <!-- مودال تصویر بزرگ -->
                <div id="image-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black bg-opacity-90 p-4">
                    <div class="relative w-full max-w-4xl h-full max-h-screen">
                        <button id="close-modal" class="absolute top-4 right-4 text-white text-2xl z-10 bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="swiper-modal-container h-full">
                            <div class="swiper-wrapper">
                                ${images.map(img => `
                                    <div class="swiper-slide flex items-center justify-center">
                                        <img src="${img}" 
                                             alt="${ad.title || 'آگهی'}" 
                                             class="max-w-full max-h-full object-contain">
                                    </div>
                                `).join('')}
                            </div>
                            <div class="swiper-pagination-modal"></div>
                            <div class="swiper-button-next-modal"></div>
                            <div class="swiper-button-prev-modal"></div>
                        </div>
                    </div>
                </div>
                
                <!-- مودال اطلاعات تماس -->
                <div id="contact-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black bg-opacity-80 p-4">
                    <div class="bg-gray-800 rounded-lg max-w-md w-full p-6 relative">
                        <button id="close-contact-modal" class="absolute top-4 left-4 text-gray-400 hover:text-white">
                            <i class="fas fa-times"></i>
                        </button>
                        <h3 class="text-xl font-bold text-white mb-4 text-center">اطلاعات تماس</h3>
                        <div class="space-y-4">
                            ${ad.playerName ? `
                            <div class="flex items-center">
                                <div class="bg-gray-700 p-2 rounded-full mr-3">
                                    <i class="fas fa-user text-gray-400"></i>
                                </div>
                                <div>
                                    <p class="text-gray-400 text-sm">نام فروشنده</p>
                                    <p class="text-white">${ad.playerName}</p>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${ad.gameId ? `
                            <div class="flex items-center">
                                <div class="bg-gray-700 p-2 rounded-full mr-3">
                                    <i class="fas fa-gamepad text-gray-400"></i>
                                </div>
                                <div>
                                    <p class="text-gray-400 text-sm">شماره گیم</p>
                                    <p class="text-white">${ad.gameId}</p>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${ad.telegramId ? `
                            <div class="flex items-center">
                                <div class="bg-gray-700 p-2 rounded-full mr-3">
                                    <i class="fab fa-telegram text-gray-400"></i>
                                </div>
                                <div>
                                    <p class="text-gray-400 text-sm">آیدی تلگرام</p>
                                    <p class="text-white">${ad.telegramId}</p>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${ad.referral ? `
                            <div class="flex items-center">
                                <div class="bg-gray-700 p-2 rounded-full mr-3">
                                    <i class="fas fa-user-tag text-gray-400"></i>
                                </div>
                                <div>
                                    <p class="text-gray-400 text-sm">رفرال</p>
                                    <p class="text-white">${ad.referral}</p>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${!ad.playerName && !ad.gameId && !ad.telegramId && !ad.referral ? `
                            <p class="text-gray-400 text-center py-4">اطلاعات تماس موجود نیست</p>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        // Initialize Swiper for main images
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
        
        // Initialize modal Swiper
        if (typeof Swiper === 'function') {
            new Swiper('.swiper-modal-container', {
                loop: true,
                pagination: {
                    el: '.swiper-pagination-modal',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next-modal',
                    prevEl: '.swiper-button-prev-modal',
                },
            });
        }
        
        // Image click handler for zoom
        $('.swiper-slide img').click(function() {
            const index = $(this).closest('.swiper-slide').index();
            $('#image-modal').removeClass('hidden').addClass('flex');
            if (typeof Swiper === 'function') {
                $('.swiper-modal-container')[0].swiper.slideToLoop(index);
            }
        });
        
        // Close modal handlers
        $('#close-modal').click(() => {
            $('#image-modal').addClass('hidden').removeClass('flex');
        });
        
        $('#image-modal').click((e) => {
            if ($(e.target).is('#image-modal')) {
                $('#image-modal').addClass('hidden').removeClass('flex');
            }
        });
        
        // Contact button click handler
        $('.contact-btn').click(() => {
            $('#contact-modal').removeClass('hidden').addClass('flex');
        });
        
        $('#close-contact-modal').click(() => {
            $('#contact-modal').addClass('hidden').removeClass('flex');
        });
        
        $('#contact-modal').click((e) => {
            if ($(e.target).is('#contact-modal')) {
                $('#contact-modal').addClass('hidden').removeClass('flex');
            }
        });
        
        // Share button handler
        $('#share-btn').click(() => {
            $('#contact-modal').html(`
                <div class="bg-gray-800 rounded-lg max-w-md w-full p-6 relative">
                    <button id="close-contact-modal" class="absolute top-4 left-4 text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                    <h3 class="text-xl font-bold text-white mb-4 text-center">در حال توسعه</h3>
                    <p class="text-gray-300 text-center py-4">
                        قابلیت اشتراک‌گذاری در حال توسعه می‌باشد. به زودی در دسترس خواهد بود.
                    </p>
                    <div class="flex justify-center mt-4">
                        <button id="ok-btn" class="px-6 py-2 bg-green-600 rounded-lg text-white hover:bg-green-700">
                            متوجه شدم
                        </button>
                    </div>
                </div>
            `);
            
            $('#close-contact-modal, #ok-btn').click(() => {
                $('#contact-modal').addClass('hidden').removeClass('flex');
            });
            
            $('#contact-modal').removeClass('hidden').addClass('flex');
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