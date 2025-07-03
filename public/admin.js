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
            showAlert('رمز عبور اشتباه است', 'error');
        }
    });

    // SHA-256 (for demo purposes)
    function sha256(str) {
        return str === 'admin123' ? hashedPassword : '';
    }

    // Show alert message
    function showAlert(message, type = 'success') {
        const alertClass = type === 'error' ? 'bg-red-500' : 'bg-green-500';
        const alertHtml = `
            <div class="fixed top-4 right-4 ${alertClass} text-white px-4 py-2 rounded-lg shadow-lg z-50 alert-message">
                ${message}
            </div>
        `;
        $('body').append(alertHtml);
        setTimeout(() => $('.alert-message').fadeOut(500, () => $(this).remove()), 3000);
    }

    // Show/hide location field based on category
    $('#ad-category').change(function() {
        if ($(this).val() === 'houses') {
            $('#location-container').removeClass('hidden');
        } else {
            $('#location-container').addClass('hidden');
        }
    });

    // Image preview and validation
    $('#ad-images').change(function() {
        const files = $(this)[0].files;
        const preview = $('#image-preview');
        preview.empty();
        
        if (files.length === 0) {
            showAlert('لطفاً حداقل یک تصویر انتخاب کنید', 'error');
            return;
        }

        if (files.length > 5) {
            showAlert('حداکثر 5 تصویر قابل آپلود است', 'error');
            $(this).val('');
            return;
        }

        for (let i = 0; i < files.length; i++) {
            if (!files[i].type.match('image.*')) {
                showAlert('فقط فایل‌های تصویری مجاز هستند', 'error');
                $(this).val('');
                preview.empty();
                return;
            }

            if (files[i].size > 2 * 1024 * 1024) { // 2MB limit
                showAlert('حجم هر تصویر باید کمتر از 2 مگابایت باشد', 'error');
                $(this).val('');
                preview.empty();
                return;
            }

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
    });

    // Load Ads with improved error handling and loading states
    function loadAdminAds() {
        const $loadingIndicator = $('#admin-ads-list').html(`
            <tr>
                <td colspan="6" class="p-4 text-center">
                    <div class="flex flex-col items-center justify-center gap-2">
                        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                        <span>در حال بارگذاری آگهی‌ها...</span>
                    </div>
                </td>
            </tr>
        `);
        
        $.ajax({
            url: '/api/ads',
            method: 'GET',
            timeout: 30000,
            dataType: 'json'
        })
        .done((response) => {
            if (!response || !response.success) {
                throw new Error(response?.error || 'Invalid response from server');
            }

            const ads = response.data || [];
            const category = $('#admin-category-filter').val();
            const status = $('#admin-status-filter').val();
            
            const filteredAds = ads.filter(ad => {
                const categoryMatch = category === 'all' || ad.category === category;
                const statusMatch = status === 'all' || 
                                 (status === 'published' && ad.published) || 
                                 (status === 'pending' && !ad.published);
                return categoryMatch && statusMatch;
            });
            
            if (filteredAds.length === 0) {
                $('#admin-ads-list').html(`
                    <tr>
                        <td colspan="6" class="p-3 text-center text-gray-400">
                            هیچ آگهی یافت نشد
                        </td>
                    </tr>
                `);
                return;
            }
            
            renderAdsList(filteredAds);
        })
        .fail((jqXHR) => {
            let errorMsg = 'خطا در بارگذاری آگهی‌ها';
            
            if (jqXHR.status === 0) {
                errorMsg = 'اتصال به سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.';
            } else if (jqXHR.status === 404) {
                errorMsg = 'آدرس API یافت نشد';
            } else if (jqXHR.status >= 500) {
                errorMsg = 'مشکل موقتی در سرور. لطفاً چند دقیقه دیگر تلاش کنید.';
            } else if (jqXHR.responseJSON?.error) {
                errorMsg = jqXHR.responseJSON.error;
            }
            
            $('#admin-ads-list').html(`
                <tr>
                    <td colspan="6" class="p-3 text-center text-red-400">
                        <div class="flex flex-col items-center gap-2">
                            <i class="fas fa-exclamation-circle text-2xl"></i>
                            <span>${errorMsg}</span>
                            <button class="text-purple-400 hover:text-purple-300" onclick="loadAdminAds()">
                                <i class="fas fa-sync-alt ml-1"></i>تلاش مجدد
                            </button>
                        </div>
                    </td>
                </tr>
            `);
        });
    }

    // Render ads list
    function renderAdsList(ads) {
        $('#admin-ads-list').empty();
        
        ads.forEach(ad => {
            // Process images from JSON string if needed
            let images = [];
            try {
                images = typeof ad.images === 'string' ? JSON.parse(ad.images) : ad.images || [];
                if (!Array.isArray(images)) images = [];
            } catch (e) {
                console.error('Error parsing images:', e);
                images = [];
            }

            const mainImage = images.length > 0 ? images[0] : 'https://via.placeholder.com/150';
            $('#admin-ads-list').append(`
                <tr class="border-b border-gray-600 hover:bg-gray-700">
                    <td class="p-2">
                        <img src="${mainImage}" class="w-12 h-12 object-cover rounded-lg" onerror="this.src='https://via.placeholder.com/150'">
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

        setupEventHandlers();
    }

    // Setup event handlers for ads list
    function setupEventHandlers() {
        // Edit Ad
        $('.edit-btn').click(function () {
            const adId = parseInt($(this).data('id'));
            const $btn = $(this);
            $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin ml-1"></i>در حال بارگذاری...');
            
            $.ajax({
                url: `/api/ads/${adId}`,
                method: 'GET',
                timeout: 10000
            })
            .done((response) => {
                if (!response || !response.success || !response.data) {
                    throw new Error(response?.error || 'آگهی مورد نظر یافت نشد');
                }
                showEditModal(response.data);
            })
            .fail((jqXHR) => {
                const errorMsg = jqXHR.responseJSON?.error || 'خطا در دریافت اطلاعات آگهی';
                console.error('Error fetching ad:', jqXHR.responseJSON);
                showAlert(`خطا: ${errorMsg}`, 'error');
            })
            .always(() => {
                $btn.prop('disabled', false).html('<i class="fas fa-edit ml-1"></i>ویرایش');
            });
        });

        // Delete Ad with confirmation
        $('.delete-btn').click(function () {
            const adId = parseInt($(this).data('id'));
            const $btn = $(this);
            
            // Custom confirmation modal
            const confirmHtml = `
                <div class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                    <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                        <div class="p-4 border-b border-gray-700">
                            <h3 class="text-lg font-bold">تأیید حذف آگهی</h3>
                        </div>
                        <div class="p-4">
                            <p>آیا مطمئن هستید که می‌خواهید این آگهی را حذف کنید؟ این عمل قابل بازگشت نیست.</p>
                        </div>
                        <div class="p-4 border-t border-gray-700 flex justify-end gap-2">
                            <button class="cancel-delete bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                                انصراف
                            </button>
                            <button class="confirm-delete bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600" data-id="${adId}">
                                <i class="fas fa-trash ml-1"></i>حذف
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            $('body').append(confirmHtml);
            
            $('.cancel-delete').click(() => $('.fixed.inset-0').remove());
            
            $('.confirm-delete').click(function() {
                const $confirmBtn = $(this);
                $confirmBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin ml-1"></i>در حال حذف...');
                
                $.ajax({
                    url: `/api/ads/${adId}`,
                    method: 'DELETE',
                    dataType: 'json',
                    timeout: 10000
                })
                .done(() => {
                    $('.fixed.inset-0').remove();
                    loadAdminAds();
                    showAlert('آگهی با موفقیت حذف شد');
                })
                .fail((jqXHR) => {
                    const errorMsg = jqXHR.responseJSON?.error || 'خطا در حذف آگهی';
                    console.error('Error deleting ad:', jqXHR.responseJSON);
                    showAlert(`خطا: ${errorMsg}`, 'error');
                })
                .always(() => {
                    $confirmBtn.prop('disabled', false).html('<i class="fas fa-trash ml-1"></i>حذف');
                });
            });
        });

        // Publish/Unpublish Ad
        $('.publish-btn').click(function () {
            const adId = parseInt($(this).data('id'));
            const $btn = $(this);
            $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin ml-1"></i>در حال پردازش...');
            
            $.ajax({
                url: `/api/ads/${adId}`,
                method: 'GET',
                timeout: 10000
            })
            .done((response) => {
                if (!response || !response.success || !response.data) {
                    throw new Error('آگهی مورد نظر یافت نشد');
                }
                
                const ad = response.data;
                
                $.ajax({
                    url: `/api/ads/${adId}`,
                    method: 'PUT',
                    contentType: 'application/json',
                    dataType: 'json',
                    timeout: 10000,
                    data: JSON.stringify({ 
                        ...ad, 
                        published: !ad.published 
                    }),
                    success: () => {
                        loadAdminAds();
                        showAlert(`آگهی با موفقیت ${!ad.published ? 'منتشر' : 'از حالت انتشار خارج'} شد`);
                    },
                    error: (jqXHR) => {
                        const errorMsg = jqXHR.responseJSON?.error || 'خطا در تغییر وضعیت آگهی';
                        console.error('Error updating ad status:', jqXHR.responseJSON);
                        showAlert(`خطا: ${errorMsg}`, 'error');
                    }
                });
            })
            .fail((jqXHR) => {
                const errorMsg = jqXHR.responseJSON?.error || 'خطا در دریافت اطلاعات آگهی';
                console.error('Error fetching ad:', jqXHR.responseJSON);
                showAlert(`خطا: ${errorMsg}`, 'error');
            })
            .always(() => {
                $btn.prop('disabled', false).html(`
                    <i class="fas ${$btn.find('i').hasClass('fa-eye') ? 'fa-eye-slash' : 'fa-eye'} ml-1"></i>
                    ${$btn.text().includes('انتشار') ? 'عدم انتشار' : 'انتشار'}
                `);
            });
        });
    }

    // Show edit modal with improved image handling
    function showEditModal(ad) {
        // Process images from JSON string if needed
        let images = [];
        try {
            images = typeof ad.images === 'string' ? JSON.parse(ad.images) : ad.images || [];
            if (!Array.isArray(images)) images = [];
        } catch (e) {
            console.error('Error parsing images:', e);
            images = [];
        }

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
                                <label class="block text-gray-400 mb-1">عنوان آگهی <span class="text-red-500">*</span></label>
                                <input type="text" id="edit-title" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" value="${ad.title}" required>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-gray-400 mb-1">قیمت ($) <span class="text-red-500">*</span></label>
                                    <input type="number" id="edit-price" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" value="${ad.price}" required>
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
                                <label class="block text-gray-400 mb-1">توضیحات <span class="text-red-500">*</span></label>
                                <textarea id="edit-description" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" rows="4" required>${ad.description}</textarea>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-gray-400 mb-1">دسته‌بندی <span class="text-red-500">*</span></label>
                                    <select id="edit-category" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" required>
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
                                <label class="block text-gray-400 mb-1">تصاویر آگهی <span class="text-red-500">*</span></label>
                                <div class="border border-gray-600 rounded-lg p-3">
                                    <div class="grid grid-cols-3 gap-2 mb-3" id="edit-current-images">
                                        ${images.map((img, index) => `
                                            <div class="relative group">
                                                <img src="${img}" class="w-full h-24 object-cover rounded-lg border ${index === 0 ? 'border-purple-500' : 'border-gray-600'}">
                                                <div class="absolute top-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1 rounded-bl">${index+1}</div>
                                                <button class="absolute top-0 left-0 bg-yellow-500 text-white p-1 rounded-tr rounded-bl opacity-0 group-hover:opacity-100 set-primary-btn ${index === 0 ? 'hidden' : ''}" data-index="${index}">
                                                    <i class="fas fa-star text-xs"></i>
                                                </button>
                                                <button class="absolute top-0 left-0 bg-red-500 text-white p-1 rounded-br rounded-tl opacity-0 group-hover:opacity-100 remove-image-btn" data-index="${index}">
                                                    <i class="fas fa-times text-xs"></i>
                                                </button>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="mb-3">
                                        <label class="block text-gray-400 mb-1">افزودن تصاویر جدید (اختیاری)</label>
                                        <input type="file" id="edit-ad-images" class="w-full" multiple accept="image/*">
                                    </div>
                                    <div id="edit-image-preview" class="grid grid-cols-3 gap-2"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="p-4 border-t border-gray-700 flex justify-end gap-2">
                        <button class="close-edit-modal bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                            انصراف
                        </button>
                        <button class="save-edit-btn bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600" data-id="${ad.id}">
                            <i class="fas fa-save ml-1"></i>ذخیره تغییرات
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
            
            if (files.length > 5) {
                showAlert('حداکثر 5 تصویر جدید می‌توانید اضافه کنید', 'error');
                $(this).val('');
                return;
            }

            for (let i = 0; i < files.length; i++) {
                if (!files[i].type.match('image.*')) {
                    showAlert('فقط فایل‌های تصویری مجاز هستند', 'error');
                    $(this).val('');
                    preview.empty();
                    return;
                }

                if (files[i].size > 2 * 1024 * 1024) { // 2MB limit
                    showAlert('حجم هر تصویر باید کمتر از 2 مگابایت باشد', 'error');
                    $(this).val('');
                    preview.empty();
                    return;
                }

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

        // Remove image
        $(document).on('click', '.remove-image-btn', function() {
            const index = $(this).data('index');
            $(this).parent().remove();
            
            // Update image numbers
            $('#edit-current-images .relative.group').each(function(i) {
                $(this).find('.absolute.top-0.right-0').text(i+1);
            });
        });
        
        // Close modal
        $('.close-edit-modal').click(function() {
            $('.fixed.inset-0').remove();
        });
        
        // Save changes with validation
        $('.save-edit-btn').click(function() {
            const id = $(this).data('id');
            const title = $('#edit-title').val().trim();
            const price = $('#edit-price').val().trim();
            const gameId = $('#edit-game-id').val().trim();
            const playerName = $('#edit-player-name').val().trim();
            const referral = $('#edit-referral').val().trim();
            const description = $('#edit-description').val().trim();
            const category = $('#edit-category').val();
            const location = category === 'houses' ? $('#edit-location').val() : '';
            
            // Validation
            if (!title || !price || !description || !category) {
                showAlert('لطفاً فیلدهای ضروری را پر کنید', 'error');
                return;
            }

            if (isNaN(price)) {
                showAlert('قیمت باید یک عدد معتبر باشد', 'error');
                return;
            }

            // Check if at least one image remains
            if ($('#edit-current-images .relative.group').length === 0) {
                showAlert('حداقل یک تصویر برای آگهی ضروری است', 'error');
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
            const $btn = $(this);
            $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin ml-1"></i>در حال ذخیره...');
            
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
                    saveAdChanges(id, title, price, gameId, playerName, referral, description, category, location, newImagesOrder, $btn);
                });
            } else {
                saveAdChanges(id, title, price, gameId, playerName, referral, description, category, location, newImagesOrder, $btn);
            }
        });
        
        function saveAdChanges(id, title, price, gameId, playerName, referral, description, category, location, images, $btn) {
            $.ajax({
                url: `/api/ads/${id}`,
                method: 'PUT',
                contentType: 'application/json',
                dataType: 'json',
                timeout: 10000,
                data: JSON.stringify({ 
                    title, 
                    price, 
                    gameId, 
                    playerName,
                    referral,
                    description, 
                    category,
                    location,
                    images,
                    published: ad.published,
                    createdAt: ad.createdAt
                }),
                success: () => {
                    $('.fixed.inset-0').remove();
                    loadAdminAds();
                    showAlert('تغییرات با موفقیت ذخیره شد');
                },
                error: (jqXHR) => {
                    const errorMsg = jqXHR.responseJSON?.error || 'خطا در ویرایش آگهی';
                    console.error('Error updating ad:', jqXHR.responseJSON);
                    showAlert(`خطا: ${errorMsg}`, 'error');
                },
                complete: () => {
                    $btn.prop('disabled', false).html('<i class="fas fa-save ml-1"></i>ذخیره تغییرات');
                }
            });
        }
    }

    // Add New Ad with improved validation and image handling
    $('#add-ad-btn').click(() => {
        const title = $('#ad-title').val().trim();
        const price = $('#ad-price').val().trim();
        const gameId = $('#ad-game-id').val().trim();
        const playerName = $('#ad-player-name').val().trim();
        const referral = $('#ad-referral').val().trim();
        const description = $('#ad-description').val().trim();
        const category = $('#ad-category').val();
        const location = category === 'houses' ? $('#ad-location').val() : '';
        const images = $('#ad-images')[0].files;

        // Client-side validation
        if (!title || !price || !description || !category || images.length === 0) {
            showAlert('لطفاً تمام فیلدهای ضروری را پر کنید', 'error');
            return;
        }

        if (isNaN(price)) {
            showAlert('قیمت باید یک عدد معتبر باشد', 'error');
            return;
        }

        if (images.length > 5) {
            showAlert('حداکثر 5 تصویر قابل آپلود است', 'error');
            return;
        }

        // Add loading state
        const $btn = $('#add-ad-btn');
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin ml-1"></i>در حال ذخیره...');

        // Process images to Base64
        const promises = [];
        const imagesBase64 = [];
        
        for (let i = 0; i < images.length; i++) {
            const reader = new FileReader();
            promises.push(new Promise((resolve, reject) => {
                reader.onload = function(e) {
                    imagesBase64.push(e.target.result);
                    resolve();
                };
                reader.onerror = function() {
                    reject(new Error('خطا در خواندن فایل تصویر'));
                };
                reader.readAsDataURL(images[i]);
            }));
        }
        
        Promise.all(promises)
            .then(() => {
                const newAd = {
                    title,
                    price,
                    gameId,
                    playerName,
                    referral,
                    description,
                    category,
                    location,
                    images: imagesBase64,
                    published: false,
                    createdAt: new Date().toISOString(),
                    id: Date.now()
                };
                
                return $.ajax({
                    url: '/api/ads',
                    method: 'POST',
                    contentType: 'application/json',
                    dataType: 'json',
                    timeout: 10000,
                    data: JSON.stringify(newAd)
                });
            })
            .then(() => {
                // Reset form
                $('#ad-title, #ad-price, #ad-game-id, #ad-player-name, #ad-referral, #ad-description, #ad-images').val('');
                $('#image-preview').empty();
                $('#location-container').addClass('hidden');
                loadAdminAds();
                showAlert('آگهی با موفقیت اضافه شد!');
            })
            .catch((error) => {
                console.error('Error adding ad:', error);
                showAlert(error.message || 'خطا در افزودن آگهی', 'error');
            })
            .finally(() => {
                $btn.prop('disabled', false).html('ثبت آگهی');
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