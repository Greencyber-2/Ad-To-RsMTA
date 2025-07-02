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

    // Load Ads
    function loadAds() {
        $('#ads-loading').removeClass('hidden');
        $('#ads-list').html('');
        
        $.get('/api/ads', (ads) => {
            $('#ads-loading').addClass('hidden');
            const filteredAds = filterAds(ads);
            displayAds(filteredAds);
        }).fail(() => {
            $('#ads-loading').addClass('hidden');
            $('#ads-list').html('<p class="text-center text-gray-400 py-8">خطا در بارگذاری آگهی‌ها</p>');
        });
    }

    function filterAds(ads) {
        const query = $('#search-input').val()?.toLowerCase() || $('#mobile-search-input').val()?.toLowerCase() || '';
        const category = $('.category-btn.active').data('category') || 'all';

        return ads.filter(ad => {
            return ad.published &&
                (category === 'all' || ad.category === category) &&
                (
                    ad.title?.toLowerCase().includes(query) || 
                    ad.description?.toLowerCase().includes(query) ||
                    ad.playerName?.toLowerCase().includes(query) ||
                    ad.referral?.toLowerCase().includes(query)
                );
        });
    }

    function displayAds(ads) {
        $('#ads-list').empty();
        
        if (ads.length === 0) {
            $('#ads-list').html('<p class="text-center text-gray-400 py-8">هیچ آگهی یافت نشد</p>');
            return;
        }
        
        $('#ads-list').append(`
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-2">
                ${ads.map(ad => {
                    const mainImage = Array.isArray(ad.images) && ad.images.length > 0 ? ad.images[0] : 'https://via.placeholder.com/300';
                    const timeAgo = formatTime(ad.createdAt);
                    const categoryName = getCategoryName(ad.category);
                    
                    return `
                    <div class="group relative">
                        <a href="ad-detail.html?id=${ad.id}" class="block bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-all duration-200 border border-gray-700 hover:border-gray-600 h-full flex flex-col shadow-md hover:shadow-lg">
                            <!-- Image with category badge -->
                            <div class="aspect-square bg-gray-700 relative overflow-hidden">
                                <img src="${mainImage}" alt="${ad.title}" 
                                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                                <div class="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                    ${categoryName}
                                </div>
                            </div>
                            
                            <!-- Content -->
                            <div class="p-3 flex-1 flex flex-col">
                                <!-- Title -->
                                <h3 class="text-white text-sm font-medium mb-1 line-clamp-2 leading-tight">${ad.title}</h3>
                                
                                <!-- Price & Time -->
                                <div class="mt-auto flex justify-between items-center pt-2">
                                    <span class="text-green-500 font-bold text-sm whitespace-nowrap">${ad.price} $</span>
                                    <span class="text-gray-400 text-xs">${timeAgo}</span>
                                </div>
                            </div>
                            
                            <!-- Hover overlay effect -->
                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 pointer-events-none"></div>
                        </a>
                    </div>
                    `;
                }).join('')}
            </div>
        `);
    }
    
    function formatTime(timestamp) {
        if (!timestamp) return 'نامشخص';
        
        const now = new Date();
        const adDate = new Date(timestamp);
        const diffInSeconds = Math.floor((now - adDate) / 1000);
        
        if (diffInSeconds < 60) return 'اکنون';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} دقیقه`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ساعت`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} روز`;
        if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} ماه`;
        return `${Math.floor(diffInSeconds / 31536000)} سال`;
    }

    function getCategoryName(category) {
        const categories = {
            'all': 'همه آگهی‌ها',
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
    $('#search-btn, #mobile-search-submit').click(() => {
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

    // Load Ad Details
    const urlParams = new URLSearchParams(window.location.search);
    const adId = parseInt(urlParams.get('id'));
    if ($('#ad-detail').length && adId) {
        $.get('/api/ads', (ads) => {
            const ad = ads.find(ad => ad.id === adId);
            if (ad) {
                const timeAgo = formatTime(ad.createdAt);
                const images = Array.isArray(ad.images) ? ad.images : [ad.image || 'https://via.placeholder.com/600x400'];
                
                $('#ad-detail').html(`
                    <div class="flex flex-col gap-6">
                        <!-- Image Gallery -->
                        <div class="relative rounded-xl overflow-hidden shadow-lg">
                            <div class="swiper-container">
                                <div class="swiper-wrapper">
                                    ${images.map(img => `
                                        <div class="swiper-slide">
                                            <img src="${img}" alt="${ad.title}" class="w-full h-64 sm:h-96 object-cover">
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="swiper-pagination"></div>
                                <div class="swiper-button-next"></div>
                                <div class="swiper-button-prev"></div>
                            </div>
                            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                                <div class="price-badge inline-flex items-center px-4 py-2 rounded-full bg-black bg-opacity-70">
                                    <span class="text-green-500 font-bold text-lg">$${ad.price}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Ad Info -->
                        <div class="flex flex-col gap-4">
                            <div>
                                <h2 class="text-2xl sm:text-3xl font-bold text-white mb-1">${ad.title}</h2>
                                <div class="flex items-center text-gray-400 text-sm gap-2">
                                    <span class="bg-gray-700 px-2 py-1 rounded-full text-xs">${getCategoryName(ad.category)}</span>
                                    <span><i class="far fa-clock ml-1"></i>${timeAgo}</span>
                                </div>
                            </div>
                            
                            <!-- Player Info -->
                            <div class="info-box p-4 bg-gray-800 rounded-lg">
                                <h3 class="text-white font-bold mb-3 text-lg border-b border-gray-700 pb-2">اطلاعات پلیر</h3>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div class="flex items-center gap-3">
                                        <div class="bg-gray-700 p-2 rounded-full">
                                            <i class="fas fa-user text-gray-400"></i>
                                        </div>
                                        <div>
                                            <p class="text-gray-400 text-xs">نام پلیر</p>
                                            <p class="text-white">${ad.playerName || 'نامشخص'}</p>
                                        </div>
                                    </div>
                                    ${ad.referral ? `
                                    <div class="flex items-center gap-3">
                                        <div class="bg-gray-700 p-2 rounded-full">
                                            <i class="fas fa-user-tag text-gray-400"></i>
                                        </div>
                                        <div>
                                            <p class="text-gray-400 text-xs">رفرال پلیر</p>
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
                                    ${ad.category === 'houses' ? `
                                    <div class="flex items-center gap-3">
                                        <div class="bg-gray-700 p-2 rounded-full">
                                            <i class="fas fa-map-marker-alt text-gray-400"></i>
                                        </div>
                                        <div>
                                            <p class="text-gray-400 text-xs">موقعیت</p>
                                            <p class="text-white">${ad.location || 'نامشخص'}</p>
                                        </div>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <!-- Ad Description -->
                            <div class="info-box p-4 bg-gray-800 rounded-lg">
                                <h3 class="text-white font-bold mb-3 text-lg border-b border-gray-700 pb-2">توضیحات</h3>
                                <p class="text-gray-300 whitespace-pre-line leading-relaxed">${ad.description}</p>
                            </div>
                            
                            <!-- Contact Seller -->
                            <div class="sticky bottom-4 left-0 right-0 z-10">
                                <div class="bg-gray-800 rounded-full shadow-xl p-2 max-w-md mx-auto">
                                    <button class="bg-gradient-to-r from-green-500 to-green-600 text-white w-full px-6 py-3 rounded-full font-bold hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center">
                                        <i class="fas fa-phone-alt ml-2"></i>
                                        تماس با فروشنده
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `);
                
                // Initialize Swiper
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
                $('#ad-detail').html('<p class="text-center text-gray-400 py-12">آگهی یافت نشد</p>');
            }
        }).fail(() => {
            $('#ad-detail').html('<p class="text-center text-gray-400 py-12">خطا در بارگذاری آگهی</p>');
        });
    }

    loadAds();
});