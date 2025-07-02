$(document).ready(() => {
    // Admin Login (Simple hash for demo)
    const hashedPassword = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; // SHA-256 of 'admin123'
    $('#login-btn').click(() => {
        const password = $('#admin-password').val();
        if (sha256(password) === hashedPassword) {
            $('#admin-login').addClass('hidden');
            $('#admin-panel').removeClass('hidden');
            loadAdminAds();
        } else {
            alert('رمز عبور اشتباه است');
        }
    });

    // SHA-256 (for demo purposes)
    function sha256(str) {
        return str === 'admin123' ? hashedPassword : '';
    }

    // Show/hide location field based on category
    $('#ad-category').change(function() {
        if ($(this).val() === 'houses') {
            $('#location-container').removeClass('hidden');
        } else {
            $('#location-container').addClass('hidden');
        }
    });

    // Image preview
    $('#ad-images').change(function() {
        const files = $(this)[0].files;
        const preview = $('#image-preview');
        preview.empty();
        
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.append(`
                        <div class="relative">
                            <img src="${e.target.result}" class="w-full h-24 object-cover rounded-lg border border-gray-600">
                            <div class="absolute top-1 left-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">${i+1}</div>
                        </div>
                    `);
                }
                reader.readAsDataURL(files[i]);
            }
        }
    });

    // Load Ads
    function loadAdminAds() {
        $('#admin-ads-list').html('<tr><td colspan="6" class="p-4 text-center"><div class="animate-pulse">در حال بارگذاری...</div></td></tr>');
        
        $.get('/api/ads', (ads) => {
            const category = $('#admin-category-filter').val();
            const status = $('#admin-status-filter').val();
            
            const filteredAds = ads.filter(ad => {
                const categoryMatch = category === 'all' || ad.category === category;
                const statusMatch = status === 'all' || 
                                 (status === 'published' && ad.published) || 
                                 (status === 'pending' && !ad.published);
                return categoryMatch && statusMatch;
            });
            
            $('#admin-ads-list').empty();
            
            if (filteredAds.length === 0) {
                $('#admin-ads-list').html('<tr><td colspan="6" class="p-3 text-center text-gray-400">هیچ آگهی یافت نشد</td></tr>');
                return;
            }
            
            filteredAds.forEach(ad => {
                const mainImage = Array.isArray(ad.images) && ad.images.length > 0 ? ad.images[0] : 'https://via.placeholder.com/150';
                $('#admin-ads-list').append(`
                    <tr class="border-b border-gray-600 hover:bg-gray-700">
                        <td class="p-2">
                            <img src="${mainImage}" class="w-12 h-12 object-cover rounded-lg">
                        </td>
                        <td class="p-2">${ad.title}</td>
                        <td class="p-2">${ad.price} $</td>
                        <td class="p-2">${getCategoryName(ad.category)}</td>
                        <td class="p-2">
                            <span class="px-2 py-1 rounded-full text-xs ${ad.published ? 'bg-green-500' : 'bg-yellow-500'}">
                                ${ad.published ? 'منتشر شده' : 'در انتظار تأیید'}
                            </span>
                        </td>
                        <td class="p-2 flex gap-2 flex-wrap">
                            <button class="edit-btn bg-yellow-500 text-white px-2 py-1 rounded-lg hover:bg-yellow-600 text-sm" data-id="${ad.id}">
                                <i class="fas fa-edit ml-1"></i>ویرایش
                            </button>
                            <button class="delete-btn bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600 text-sm" data-id="${ad.id}">
                                <i class="fas fa-trash ml-1"></i>حذف
                            </button>
                            <button class="publish-btn ${ad.published ? 'bg-gray-500' : 'bg-green-500'} text-white px-2 py-1 rounded-lg hover:opacity-80 text-sm" data-id="${ad.id}">
                                <i class="fas ${ad.published ? 'fa-eye-slash' : 'fa-eye'} ml-1"></i>
                                ${ad.published ? 'عدم انتشار' : 'انتشار'}
                            </button>
                        </td>
                    </tr>
                `);
            });

            // Edit Ad
            $('.edit-btn').click(function () {
                const adId = parseInt($(this).data('id'));
                $.get('/api/ads', (ads) => {
                    const ad = ads.find(ad => ad.id === adId);
                    
                    // Create a modal for editing
                    const modalHtml = `
                        <div class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                            <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                <div class="p-4 border-b border-gray-700 flex justify-between items-center">
                                    <h3 class="text-lg font-bold">ویرایش آگهی</h3>
                                    <button class="close-edit-modal text-gray-400 hover:text-white">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <div class="p-4">
                                    <div class="grid grid-cols-1 gap-4">
                                        <div>
                                            <label class="block text-gray-400 mb-1">عنوان آگهی</label>
                                            <input type="text" id="edit-title" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" value="${ad.title}">
                                        </div>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-gray-400 mb-1">قیمت ($)</label>
                                                <input type="text" id="edit-price" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" value="${ad.price}">
                                            </div>
                                            <div>
                                                <label class="block text-gray-400 mb-1">شماره گیم</label>
                                                <input type="text" id="edit-game-id" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" value="${ad.gameId || ''}">
                                            </div>
                                        </div>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-gray-400 mb-1">نام پلیر</label>
                                                <input type="text" id="edit-player-name" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" value="${ad.playerName || ''}">
                                            </div>
                                            <div>
                                                <label class="block text-gray-400 mb-1">رفرال پلیر</label>
                                                <input type="text" id="edit-referral" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" value="${ad.referral || ''}">
                                            </div>
                                        </div>
                                        <div>
                                            <label class="block text-gray-400 mb-1">توضیحات</label>
                                            <textarea id="edit-description" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" rows="4">${ad.description}</textarea>
                                        </div>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-gray-400 mb-1">دسته‌بندی</label>
                                                <select id="edit-category" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100">
                                                    <option value="cars" ${ad.category === 'cars' ? 'selected' : ''}>ماشین</option>
                                                    <option value="motorcycles" ${ad.category === 'motorcycles' ? 'selected' : ''}>موتور</option>
                                                    <option value="houses" ${ad.category === 'houses' ? 'selected' : ''}>خانه</option>
                                                    <option value="items" ${ad.category === 'items' ? 'selected' : ''}>آیتم</option>
                                                    <option value="others" ${ad.category === 'others' ? 'selected' : ''}>سایر</option>
                                                </select>
                                            </div>
                                            <div id="edit-location-container" class="${ad.category === 'houses' ? '' : 'hidden'}">
                                                <label class="block text-gray-400 mb-1">موقعیت</label>
                                                <select id="edit-location" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100">
                                                    <option value="LV" ${ad.location === 'LV' ? 'selected' : ''}>LV</option>
                                                    <option value="LS" ${ad.location === 'LS' ? 'selected' : ''}>LS</option>
                                                    <option value="SF" ${ad.location === 'SF' ? 'selected' : ''}>SF</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="block text-gray-400 mb-1">تصاویر آگهی</label>
                                            <div class="border border-gray-600 rounded-lg p-3">
                                                <div class="grid grid-cols-3 gap-2 mb-3" id="edit-current-images">
                                                    ${Array.isArray(ad.images) ? ad.images.map((img, index) => `
                                                        <div class="relative group">
                                                            <img src="${img}" class="w-full h-24 object-cover rounded-lg border ${index === 0 ? 'border-purple-500' : 'border-gray-600'}">
                                                            <div class="absolute top-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1 rounded-bl">${index+1}</div>
                                                            <button class="absolute top-0 left-0 bg-red-500 text-white p-1 rounded-tr rounded-bl opacity-0 group-hover:opacity-100 set-primary-btn ${index === 0 ? 'hidden' : ''}" data-index="${index}">
                                                                <i class="fas fa-star text-xs"></i>
                                                            </button>
                                                        </div>
                                                    `).join('') : ''}
                                                </div>
                                                <input type="file" id="edit-ad-images" class="w-full" multiple accept="image/*">
                                                <div id="edit-image-preview" class="mt-3 grid grid-cols-3 gap-2"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="p-4 border-t border-gray-700 flex justify-end gap-2">
                                    <button class="close-edit-modal bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                                        انصراف
                                    </button>
                                    <button class="save-edit-btn bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600" data-id="${ad.id}">
                                        ذخیره تغییرات
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    $('body').append(modalHtml);
                    
                    // Handle category change in modal
                    $('#edit-category').change(function() {
                        if ($(this).val() === 'houses') {
                            $('#edit-location-container').removeClass('hidden');
                        } else {
                            $('#edit-location-container').addClass('hidden');
                        }
                    });
                    
                    // Handle image preview in modal
                    $('#edit-ad-images').change(function() {
                        const files = $(this)[0].files;
                        const preview = $('#edit-image-preview');
                        preview.empty();
                        
                        if (files.length > 0) {
                            for (let i = 0; i < files.length; i++) {
                                const reader = new FileReader();
                                reader.onload = function(e) {
                                    preview.append(`
                                        <div class="relative">
                                            <img src="${e.target.result}" class="w-full h-24 object-cover rounded-lg border border-gray-600">
                                            <div class="absolute top-1 left-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">${i+1}</div>
                                        </div>
                                    `);
                                }
                                reader.readAsDataURL(files[i]);
                            }
                        }
                    });
                    
                    // Set primary image
                    $(document).on('click', '.set-primary-btn', function() {
                        const index = $(this).data('index');
                        const currentImages = $('#edit-current-images');
                        
                        // Move the selected image to the first position
                        const imgElement = currentImages.find(`.relative.group img:nth-child(${index+1})`).parent();
                        currentImages.prepend(imgElement);
                        
                        // Update all image borders and buttons
                        currentImages.find('img').removeClass('border-purple-500').addClass('border-gray-600');
                        currentImages.find('img:first').removeClass('border-gray-600').addClass('border-purple-500');
                        currentImages.find('.set-primary-btn').removeClass('hidden');
                        currentImages.find('.set-primary-btn:first').addClass('hidden');
                    });
                    
                    // Close modal
                    $('.close-edit-modal').click(function() {
                        $('.fixed.inset-0').remove();
                    });
                    
                    // Save changes
                    $('.save-edit-btn').click(function() {
                        const id = $(this).data('id');
                        const title = $('#edit-title').val();
                        const price = $('#edit-price').val();
                        const gameId = $('#edit-game-id').val();
                        const playerName = $('#edit-player-name').val();
                        const referral = $('#edit-referral').val();
                        const description = $('#edit-description').val();
                        const category = $('#edit-category').val();
                        const location = category === 'houses' ? $('#edit-location').val() : '';
                        
                        if (!title || !price || !description || !category) {
                            alert('لطفاً فیلدهای ضروری را پر کنید');
                            return;
                        }
                        
                        // Get the new order of images (first image is primary)
                        const newImagesOrder = [];
                        $('#edit-current-images .relative.group').each(function() {
                            const imgSrc = $(this).find('img').attr('src');
                            newImagesOrder.push(imgSrc);
                        });
                        
                        // Handle new images if any
                        const newImagesFiles = $('#edit-ad-images')[0].files;
                        if (newImagesFiles.length > 0) {
                            const promises = [];
                            
                            for (let i = 0; i < newImagesFiles.length; i++) {
                                const reader = new FileReader();
                                promises.push(new Promise((resolve) => {
                                    reader.onload = function(e) {
                                        newImagesOrder.push(e.target.result);
                                        resolve();
                                    };
                                    reader.readAsDataURL(newImagesFiles[i]);
                                }));
                            }
                            
                            Promise.all(promises).then(() => {
                                saveAdChanges(id, title, price, gameId, playerName, referral, description, category, location, newImagesOrder);
                            });
                        } else {
                            saveAdChanges(id, title, price, gameId, playerName, referral, description, category, location, newImagesOrder);
                        }
                    });
                    
                    function saveAdChanges(id, title, price, gameId, playerName, referral, description, category, location, images) {
                        $.ajax({
                            url: `/api/ads/${id}`,
                            method: 'PUT',
                            contentType: 'application/json',
                            data: JSON.stringify({ 
                                ...ad, 
                                title, 
                                price, 
                                gameId, 
                                playerName,
                                referral,
                                description, 
                                category,
                                location,
                                images
                            }),
                            success: () => {
                                $('.fixed.inset-0').remove();
                                loadAdminAds();
                            },
                            error: () => alert('خطا در ویرایش آگهی')
                        });
                    }
                });
            });

            // Delete Ad
            $('.delete-btn').click(function () {
                const adId = parseInt($(this).data('id'));
                if (confirm('آیا مطمئن هستید که می‌خواهید این آگهی را حذف کنید؟')) {
                    $.ajax({
                        url: `/api/ads/${adId}`,
                        method: 'DELETE',
                        success: () => loadAdminAds(),
                        error: () => alert('خطا در حذف آگهی')
                    });
                }
            });

            // Publish/Unpublish Ad
            $('.publish-btn').click(function () {
                const adId = parseInt($(this).data('id'));
                $.get('/api/ads', (ads) => {
                    const ad = ads.find(ad => ad.id === adId);
                    $.ajax({
                        url: `/api/ads/${adId}`,
                        method: 'PUT',
                        contentType: 'application/json',
                        data: JSON.stringify({ ...ad, published: !ad.published }),
                        success: () => loadAdminAds(),
                        error: () => alert('خطا در تغییر وضعیت آگهی')
                    });
                });
            });
        }).fail(() => {
            $('#admin-ads-list').html('<tr><td colspan="6" class="p-3 text-center text-gray-400">خطا در بارگذاری آگهی‌ها</td></tr>');
        });
    }

    // Add New Ad
    $('#add-ad-btn').click(() => {
        const title = $('#ad-title').val();
        const price = $('#ad-price').val();
        const gameId = $('#ad-game-id').val();
        const playerName = $('#ad-player-name').val();
        const referral = $('#ad-referral').val();
        const description = $('#ad-description').val();
        const category = $('#ad-category').val();
        const location = category === 'houses' ? $('#ad-location').val() : '';
        const images = $('#ad-images')[0].files;

        if (!title || !price || !description || !category || images.length === 0) {
            alert('لطفاً تمام فیلدهای ضروری را پر کنید');
            return;
        }

        const promises = [];
        const imagesBase64 = [];
        
        for (let i = 0; i < images.length; i++) {
            const reader = new FileReader();
            promises.push(new Promise((resolve) => {
                reader.onload = function(e) {
                    imagesBase64.push(e.target.result);
                    resolve();
                };
                reader.readAsDataURL(images[i]);
            }));
        }
        
        Promise.all(promises).then(() => {
            const newAd = {
                id: Date.now(),
                title,
                price,
                gameId,
                playerName,
                referral,
                description,
                category,
                location,
                images: imagesBase64,
                details: description,
                published: false,
                createdAt: new Date().toISOString()
            };
            
            $.ajax({
                url: '/api/ads',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(newAd),
                success: () => {
                    $('#ad-title, #ad-price, #ad-game-id, #ad-player-name, #ad-referral, #ad-description, #ad-images').val('');
                    $('#image-preview').empty();
                    loadAdminAds();
                },
                error: () => alert('خطا در افزودن آگهی')
            });
        });
    });

    // Filter by Category or Status
    $('#admin-category-filter, #admin-status-filter').change(() => loadAdminAds());

    function getCategoryName(category) {
        const categories = {
            'cars': 'ماشین',
            'motorcycles': 'موتور',
            'houses': 'خانه',
            'items': 'آیتم',
            'others': 'سایر'
        };
        return categories[category] || category;
    }
});