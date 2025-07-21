$(document).ready(() => {
    // Admin Login (Simple hash for demo)
    const hashedPassword = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; // SHA-256 of 'admin'
    const adminUsername = 'Admin';
    
    // Current page for pagination
    let currentPage = 1;
    const adsPerPage = 10;
    let allAds = [];
    let allUsers = [];
    let categoryChart = null;
    let dailyAdsChart = null;
    
    // Initialize the admin panel
    function initAdminPanel() {
        loadDashboardStats();
        loadAdminAds();
        loadUsers();
        setupEventHandlers();
    }
    
    // Login handler
    $('#login-btn').click(() => {
        const username = $('#admin-username').val();
        const password = $('#admin-password').val();
        
        if (username === adminUsername && sha256(password) === hashedPassword) {
            $('#admin-login').addClass('hidden');
            $('#admin-panel').removeClass('hidden');
            initAdminPanel();
            showAlert('با موفقیت وارد شدید', 'success');
        } else {
            showAlert('نام کاربری یا رمز عبور اشتباه است', 'error');
        }
    });

    // SHA-256 (for demo purposes)
    function sha256(str) {
        return str === 'admin' ? hashedPassword : '';
    }

    // Show alert message
    function showAlert(message, type = 'success') {
        // Remove existing alerts first
        $('.alert-message').remove();
        
        const alertClass = type === 'error' ? 'bg-red-500' : 'bg-green-500';
        const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
        
        const alertHtml = `
            <div class="fixed top-4 right-4 ${alertClass} text-white px-4 py-3 rounded-lg shadow-lg z-50 alert-message flex items-center gap-2">
                <i class="fas ${icon}"></i>
                ${message}
            </div>
        `;
        $('body').append(alertHtml);
        setTimeout(() => $('.alert-message').fadeOut(500, function() { $(this).remove(); }), 3000);
    }

    // Load Ads with improved error handling and loading states
    function loadAdminAds() {
        const $loadingIndicator = $('#admin-ads-list').html(`
            <tr>
                <td colspan="9" class="p-4 text-center">
                    <div class="flex flex-col items-center justify-center gap-2">
                        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                        <span>در حال بارگذاری آگهی‌ها...</span>
                    </div>
                </td>
            </tr>
        `);
        
        $.ajax({
            url: 'https://still-base-3ac7.dns555104.workers.dev/api/ads',
            method: 'GET',
            timeout: 30000,
            dataType: 'json'
        })
        .done((response) => {
            if (!response || !response.success) {
                throw new Error(response?.error || 'Invalid response from server');
            }

            allAds = response.data || [];
            filterAndPaginateAds();
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
                    <td colspan="9" class="p-3 text-center text-red-400">
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

    // Filter and paginate ads
    function filterAndPaginateAds() {
        const category = $('#admin-category-filter').val();
        const status = $('#admin-status-filter').val();
        const type = $('#admin-type-filter').val();
        const searchQuery = $('#admin-search').val().toLowerCase();
        
        const filteredAds = allAds.filter(ad => {
            const categoryMatch = category === 'all' || ad.category === category;
            const statusMatch = status === 'all' || 
                             (status === 'published' && ad.published) || 
                             (status === 'pending' && !ad.published);
            const typeMatch = type === 'all' || ad.type === type;
            const searchMatch = searchQuery === '' || 
                               ad.title.toLowerCase().includes(searchQuery) || 
                               (ad.description && ad.description.toLowerCase().includes(searchQuery)) ||
                               (ad.playerName && ad.playerName.toLowerCase().includes(searchQuery)) ||
                               (ad.telegramId && ad.telegramId.toLowerCase().includes(searchQuery));
            
            return categoryMatch && statusMatch && typeMatch && searchMatch;
        });
        
        // Update pagination
        updatePagination(filteredAds.length);
        
        // Get ads for current page
        const startIndex = (currentPage - 1) * adsPerPage;
        const paginatedAds = filteredAds.slice(startIndex, startIndex + adsPerPage);
        
        if (paginatedAds.length === 0) {
            $('#admin-ads-list').html(`
                <tr>
                    <td colspan="9" class="p-3 text-center text-gray-400">
                        هیچ آگهی یافت نشد
                    </td>
                </tr>
            `);
            return;
        }
        
        renderAdsList(paginatedAds);
    }

    // Update pagination controls
    function updatePagination(totalAds) {
        const totalPages = Math.ceil(totalAds / adsPerPage);
        
        $('#showing-from').text(((currentPage - 1) * adsPerPage) + 1);
        $('#showing-to').text(Math.min(currentPage * adsPerPage, totalAds));
        $('#total-ads').text(totalAds);
        
        $('#prev-page').prop('disabled', currentPage === 1);
        $('#next-page').prop('disabled', currentPage === totalPages || totalPages === 0);
        
        // Generate page numbers
        const $paginationNumbers = $('#pagination-numbers');
        $paginationNumbers.empty();
        
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        if (startPage > 1) {
            $paginationNumbers.append(`
                <button class="page-number px-3 py-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600" data-page="1">1</button>
                ${startPage > 2 ? '<span class="px-1 text-gray-400">...</span>' : ''}
            `);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            $paginationNumbers.append(`
                <button class="page-number px-3 py-1 rounded-lg ${i === currentPage ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-page="${i}">${i}</button>
            `);
        }
        
        if (endPage < totalPages) {
            $paginationNumbers.append(`
                ${endPage < totalPages - 1 ? '<span class="px-1 text-gray-400">...</span>' : ''}
                <button class="page-number px-3 py-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600" data-page="${totalPages}">${totalPages}</button>
            `);
        }
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
            const statusBadge = ad.published ? 
                '<span class="px-2 py-1 rounded-full text-xs bg-green-500">منتشر شده</span>' : 
                '<span class="px-2 py-1 rounded-full text-xs bg-yellow-500">در انتظار تأیید</span>';
            
            let typeBadge = '';
            if (ad.type === 'fast') {
                typeBadge = '<span class="status-badge status-fast">Fast</span>';
            } else if (ad.type === 'vip') {
                typeBadge = '<span class="status-badge status-vip">VIP</span>';
            } else {
                typeBadge = '<span class="status-badge status-normal">معمولی</span>';
            }
            
            $('#admin-ads-list').append(`
                <tr class="border-b border-gray-600 hover:bg-gray-700">
                    <td class="p-2">
                        <label class="custom-checkbox">
                            <input type="checkbox" class="ad-checkbox" data-id="${ad.id}">
                            <span class="checkmark"></span>
                        </label>
                    </td>
                    <td class="p-2">
                        <img src="${mainImage}" class="w-12 h-12 object-cover rounded-lg" onerror="this.src='https://via.placeholder.com/150'">
                    </td>
                    <td class="p-2">${ad.title}</td>
                    <td class="p-2">${ad.price} $</td>
                    <td class="p-2">${getCategoryName(ad.category)}</td>
                    <td class="p-2">${statusBadge}</td>
                    <td class="p-2">${typeBadge}</td>
                    <td class="p-2">${ad.createdAt ? new Date(ad.createdAt).toLocaleDateString('fa-IR') : '-'}</td>
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
                                    <label class="block text-gray-400 mb-1">آیدی تلگرام <span class="text-red-500">*</span></label>
                                    <input type="text" id="edit-telegram-id" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" value="${ad.telegramId || ''}" required>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-gray-400 mb-1">رفرال پلیر</label>
                                    <input type="text" id="edit-referral" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" value="${ad.referral || ''}">
                                </div>
                                <div>
                                    <label class="block text-gray-400 mb-1">وضعیت انتشار</label>
                                    <div class="flex items-center gap-2">
                                        <label class="flex items-center gap-1">
                                            <input type="checkbox" id="edit-published" ${ad.published ? 'checked' : ''} class="rounded border-gray-600 bg-gray-700 text-purple-500">
                                            <span>منتشر شده</span>
                                        </label>
                                    </div>
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
                                <label class="block text-gray-400 mb-1">نوع آگهی <span class="text-red-500">*</span></label>
                                <div class="flex flex-wrap gap-4">
                                    <label class="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="edit-type" value="normal" class="form-radio text-blue-500" ${(!ad.type || ad.type === 'normal') ? 'checked' : ''}>
                                        <span class="status-badge status-normal">معمولی</span>
                                    </label>
                                    <label class="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="edit-type" value="fast" class="form-radio text-green-500" ${ad.type === 'fast' ? 'checked' : ''}>
                                        <span class="status-badge status-fast">Fast</span>
                                    </label>
                                    <label class="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="edit-type" value="vip" class="form-radio text-purple-500" ${ad.type === 'vip' ? 'checked' : ''}>
                                        <span class="status-badge status-vip">VIP</span>
                                    </label>
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
            const telegramId = $('#edit-telegram-id').val().trim();
            const referral = $('#edit-referral').val().trim();
            const description = $('#edit-description').val().trim();
            const category = $('#edit-category').val();
            const location = category === 'houses' ? $('#edit-location').val() : '';
            const published = $('#edit-published').is(':checked');
            const type = $('input[name="edit-type"]:checked').val() || 'normal';
            
            // Validation
            if (!title || !price || !description || !category || !telegramId) {
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
                    saveAdChanges(id, title, price, gameId, playerName, telegramId, referral, description, category, location, published, type, newImagesOrder, $btn);
                });
            } else {
                saveAdChanges(id, title, price, gameId, playerName, telegramId, referral, description, category, location, published, type, newImagesOrder, $btn);
            }
        });
        
        function saveAdChanges(id, title, price, gameId, playerName, telegramId, referral, description, category, location, published, type, images, $btn) {
            $.ajax({
                url: `https://still-base-3ac7.dns555104.workers.dev/api/ads/${id}`,
                method: 'PUT',
                contentType: 'application/json',
                dataType: 'json',
                timeout: 10000,
                data: JSON.stringify({ 
                    title, 
                    price, 
                    gameId, 
                    playerName,
                    telegramId,
                    referral,
                    description, 
                    category,
                    location,
                    images,
                    published,
                    type,
                    createdAt: ad.createdAt
                }),
                success: () => {
                    $('.fixed.inset-0').remove();
                    loadAdminAds();
                    loadDashboardStats();
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

    // Load Users with improved structure
    function loadUsers() {
        $('#users-list').html(`
            <tr>
                <td colspan="8" class="p-4 text-center">
                    <div class="flex flex-col items-center justify-center gap-2">
                        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <span>در حال بارگذاری کاربران...</span>
                    </div>
                </td>
            </tr>
        `);
        
        // Simulate API call with timeout
        setTimeout(() => {
            // Extract users from ads and add additional fields
            const usersMap = {};
            allAds.forEach(ad => {
                if (ad.playerName) {
                    if (!usersMap[ad.playerName]) {
                        usersMap[ad.playerName] = {
                            id: `user_${Object.keys(usersMap).length + 1}`,
                            name: ad.playerName,
                            telegramId: ad.telegramId || 'ندارد',
                            status: ['active', 'suspended', 'banned'][Math.floor(Math.random() * 3)],
                            verified: Math.random() > 0.5,
                            adsCount: 0,
                            activeAds: 0,
                            createdAt: ad.createdAt,
                            notes: ''
                        };
                    }
                    usersMap[ad.playerName].adsCount++;
                    if (ad.published) {
                        usersMap[ad.playerName].activeAds++;
                    }
                }
            });
            
            allUsers = Object.values(usersMap);
            filterUsers();
        }, 1000);
    }

    // Filter users
    function filterUsers() {
        const searchQuery = $('#users-search').val().toLowerCase();
        const statusFilter = $('#user-status-filter').val();
        const verifiedFilter = $('#user-verified-filter').val();
        
        const filteredUsers = allUsers.filter(user => {
            const searchMatch = searchQuery === '' || 
                               user.name.toLowerCase().includes(searchQuery) || 
                               (user.telegramId && user.telegramId.toLowerCase().includes(searchQuery));
            
            const statusMatch = statusFilter === 'all' || user.status === statusFilter;
            
            let verifiedMatch = true;
            if (verifiedFilter === 'verified') {
                verifiedMatch = user.verified;
            } else if (verifiedFilter === 'unverified') {
                verifiedMatch = !user.verified;
            }
            
            return searchMatch && statusMatch && verifiedMatch;
        });
        
        renderUsersList(filteredUsers);
    }

    // Render users list with enhanced UI
    function renderUsersList(users) {
        $('#users-list').empty();
        
        if (users.length === 0) {
            $('#users-list').html(`
                <tr>
                    <td colspan="8" class="p-4 text-center text-gray-400">
                        هیچ کاربری یافت نشد
                    </td>
                </tr>
            `);
            return;
        }
        
        users.forEach(user => {
            let statusBadge = '';
            if (user.status === 'active') {
                statusBadge = '<span class="px-2 py-1 rounded-full text-xs bg-green-500">فعال</span>';
            } else if (user.status === 'suspended') {
                statusBadge = '<span class="px-2 py-1 rounded-full text-xs bg-yellow-500">معلق</span>';
            } else {
                statusBadge = '<span class="px-2 py-1 rounded-full text-xs bg-red-500">مسدود</span>';
            }
            
            const verifiedBadge = user.verified ? 
                '<i class="fas fa-check-circle text-blue-400 user-verified"></i>' : 
                '<i class="fas fa-times-circle text-gray-400"></i>';
            
            $('#users-list').append(`
                <tr class="border-b border-gray-600 hover:bg-gray-700">
                    <td class="p-3">${user.name}</td>
                    <td class="p-3">${user.telegramId}</td>
                    <td class="p-3">${statusBadge}</td>
                    <td class="p-3 text-center">${verifiedBadge}</td>
                    <td class="p-3">${user.adsCount}</td>
                    <td class="p-3">${user.activeAds}</td>
                    <td class="p-3">${user.createdAt ? new Date(user.createdAt).toLocaleDateString('fa-IR') : '-'}</td>
                    <td class="p-3 flex gap-2">
                        <button class="view-user-ads bg-blue-500 text-white px-2 py-1 rounded-lg hover:bg-blue-600 text-sm" data-id="${user.id}" data-name="${user.name}">
                            <i class="fas fa-eye ml-1"></i>
                        </button>
                        <button class="edit-user-btn bg-yellow-500 text-white px-2 py-1 rounded-lg hover:bg-yellow-600 text-sm" data-id="${user.id}">
                            <i class="fas fa-edit ml-1"></i>
                        </button>
                        <button class="delete-user-btn bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600 text-sm" data-id="${user.id}">
                            <i class="fas fa-trash ml-1"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
    }

    // Show user ads modal
    function showUserAdsModal(playerName) {
        const userAds = allAds.filter(ad => ad.playerName === playerName);
        
        $('#user-ads-modal-title').text(`آگهی‌های ${playerName}`);
        $('#user-ads-list').empty();
        
        if (userAds.length === 0) {
            $('#user-ads-list').html(`
                <tr>
                    <td colspan="6" class="p-4 text-center text-gray-400">
                        هیچ آگهی یافت نشد
                    </td>
                </tr>
            `);
        } else {
            userAds.forEach(ad => {
                const statusBadge = ad.published ? 
                    '<span class="px-2 py-1 rounded-full text-xs bg-green-500">منتشر شده</span>' : 
                    '<span class="px-2 py-1 rounded-full text-xs bg-yellow-500">در انتظار تأیید</span>';
                
                let typeBadge = '';
                if (ad.type === 'fast') {
                    typeBadge = '<span class="status-badge status-fast">Fast</span>';
                } else if (ad.type === 'vip') {
                    typeBadge = '<span class="status-badge status-vip">VIP</span>';
                } else {
                    typeBadge = '<span class="status-badge status-normal">معمولی</span>';
                }
                
                $('#user-ads-list').append(`
                    <tr class="border-b border-gray-600 hover:bg-gray-700">
                        <td class="p-3">${ad.title}</td>
                        <td class="p-3">${ad.price} $</td>
                        <td class="p-3">${getCategoryName(ad.category)}</td>
                        <td class="p-3">${statusBadge}</td>
                        <td class="p-3">${ad.createdAt ? new Date(ad.createdAt).toLocaleDateString('fa-IR') : '-'}</td>
                        <td class="p-3">
                            <button class="edit-btn bg-yellow-500 text-white px-2 py-1 rounded-lg hover:bg-yellow-600 text-sm" data-id="${ad.id}">
                                <i class="fas fa-edit ml-1"></i>ویرایش
                            </button>
                        </td>
                    </tr>
                `);
            });
        }
        
        $('#user-ads-modal').removeClass('hidden');
    }

    // Show add/edit user modal
    function showUserModal(user = null) {
        const isEdit = user !== null;
        const modalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                    <div class="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h3 class="text-lg font-bold">${isEdit ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}</h3>
                        <button class="close-user-modal text-gray-400 hover:text-white">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="p-4">
                        <div class="space-y-4">
                            <div>
                                <label for="user-name" class="block text-gray-400 mb-1">نام پلیر <span class="text-red-500">*</span></label>
                                <input type="text" id="user-name" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" value="${user?.name || ''}" required>
                            </div>
                            <div>
                                <label for="user-telegram" class="block text-gray-400 mb-1">آیدی تلگرام <span class="text-red-500">*</span></label>
                                <input type="text" id="user-telegram" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" value="${user?.telegramId || ''}" required>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label for="user-status" class="block text-gray-400 mb-1">وضعیت <span class="text-red-500">*</span></label>
                                    <select id="user-status" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100" required>
                                        <option value="active" ${user?.status === 'active' ? 'selected' : ''}>فعال</option>
                                        <option value="suspended" ${user?.status === 'suspended' ? 'selected' : ''}>معلق</option>
                                        <option value="banned" ${user?.status === 'banned' ? 'selected' : ''}>مسدود</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-gray-400 mb-1">احراز هویت</label>
                                    <div class="flex items-center mt-3">
                                        <input type="checkbox" id="user-verified" class="rounded border-gray-600 bg-gray-700 text-blue-500" ${user?.verified ? 'checked' : ''}>
                                        <label for="user-verified" class="mr-2 text-gray-300">تایید شده</label>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label for="user-notes" class="block text-gray-400 mb-1">یادداشت‌ها</label>
                                <textarea id="user-notes" rows="3" class="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100">${user?.notes || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div class="p-4 border-t border-gray-700 flex justify-end gap-2">
                        <button class="close-user-modal bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                            انصراف
                        </button>
                        <button class="save-user-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600" data-id="${user?.id || ''}">
                            <i class="fas fa-save ml-1"></i>ذخیره
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        $('body').append(modalHtml);
        
        // Close modal
        $('.close-user-modal').click(function() {
            $('#user-modal').remove();
        });
        
        // Save user
        $('.save-user-btn').click(function() {
            const id = $(this).data('id');
            const name = $('#user-name').val().trim();
            const telegramId = $('#user-telegram').val().trim();
            const status = $('#user-status').val();
            const verified = $('#user-verified').is(':checked');
            const notes = $('#user-notes').val().trim();
            
            // Validation
            if (!name || !telegramId) {
                showAlert('لطفاً فیلدهای ضروری را پر کنید', 'error');
                return;
            }
            
            const $btn = $(this);
            $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin ml-1"></i>در حال ذخیره...');
            
            // Simulate API call
            setTimeout(() => {
                if (isEdit) {
                    // Update existing user
                    const userIndex = allUsers.findIndex(u => u.id === id);
                    if (userIndex !== -1) {
                        allUsers[userIndex] = {
                            ...allUsers[userIndex],
                            name,
                            telegramId,
                            status,
                            verified,
                            notes
                        };
                    }
                } else {
                    // Add new user
                    const newUser = {
                        id: `user_${Date.now()}`,
                        name,
                        telegramId,
                        status,
                        verified,
                        adsCount: 0,
                        activeAds: 0,
                        createdAt: new Date().toISOString(),
                        notes
                    };
                    allUsers.unshift(newUser);
                }
                
                $('#user-modal').remove();
                filterUsers();
                showAlert(`کاربر با موفقیت ${isEdit ? 'ویرایش' : 'افزود'} شد`);
            }, 1000);
        });
    }

    // Load dashboard statistics and charts
    function loadDashboardStats() {
        // Ping Cloudflare
        pingServer('https://still-base-3ac7.dns555104.workers.dev/api', '#cloudflare-status', '#cloudflare-ping');
        
        // Ping Database
        pingServer('https://still-base-3ac7.dns555104.workers.dev/api/ads', '#database-status', '#database-ping');
        
        // Ping Website
        pingServer('https://ad-to-rs-mta.vercel.app', '#website-status', '#website-ping');
        
        // Get system info
        getSystemInfo();
        
        // Calculate stats from ads data
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        // Calculate stats
        const totalAds = allAds.length;
        const publishedAds = allAds.filter(ad => ad.published).length;
        const pendingAds = allAds.filter(ad => !ad.published).length;
        const todayAds = allAds.filter(ad => ad.createdAt && ad.createdAt.split('T')[0] === today).length;
        const yesterdayAds = allAds.filter(ad => ad.createdAt && ad.createdAt.split('T')[0] === yesterdayStr).length;
        
        const publishedRatio = totalAds > 0 ? Math.round((publishedAds / totalAds) * 100) : 0;
        const pendingRatio = totalAds > 0 ? Math.round((pendingAds / totalAds) * 100) : 0;
        
        const adsChangePercent = yesterdayAds > 0 ? 
            Math.round(((todayAds - yesterdayAds) / yesterdayAds) * 100) : 
            todayAds > 0 ? 100 : 0;
        
        const vipAds = allAds.filter(ad => ad.type === 'vip').length;
        const fastAds = allAds.filter(ad => ad.type === 'fast').length;
        const normalAds = allAds.filter(ad => !ad.type || ad.type === 'normal').length;
        const premiumAds = vipAds + fastAds;
        
        // Update UI
        $('#total-ads-count').text(totalAds);
        $('#published-ads-count').text(publishedAds);
        $('#pending-ads-count').text(pendingAds);
        $('#today-ads-count').text(todayAds);
        
        $('#published-ratio').text(`${publishedRatio}%`);
        $('#pending-ratio').text(`${pendingRatio}%`);
        $('#published-ratio-bar').css('width', `${publishedRatio}%`);
        $('#pending-ratio-bar').css('width', `${pendingRatio}%`);
        
        $('#ads-change-percent').text(`${adsChangePercent > 0 ? '+' : ''}${adsChangePercent}%`);
        $('#today-ratio-bar').css('width', `${Math.min(100, todayAds / (yesterdayAds || 1) * 100)}%`);
        
        $('#vip-ads-count').text(vipAds);
        $('#fast-ads-count').text(fastAds);
        $('#normal-ads-count').text(normalAds);
        $('#premium-ads-count').text(premiumAds);
        
        $('#premium-ratio-bar').css('width', `${(premiumAds / totalAds) * 100}%`);

        // Show recent ads
        const recentAds = allAds.slice(0, 5);
        const recentAdsHtml = recentAds.map(ad => {
            let typeBadge = '';
            if (ad.type === 'fast') {
                typeBadge = '<span class="status-badge status-fast">Fast</span>';
            } else if (ad.type === 'vip') {
                typeBadge = '<span class="status-badge status-vip">VIP</span>';
            } else {
                typeBadge = '<span class="status-badge status-normal">معمولی</span>';
            }
            
            return `
                <tr class="border-b border-gray-700 hover:bg-gray-700">
                    <td class="p-3">${ad.title}</td>
                    <td class="p-3">${ad.price} $</td>
                    <td class="p-3">${getCategoryName(ad.category)}</td>
                    <td class="p-3">
                        <span class="px-2 py-1 rounded-full text-xs ${ad.published ? 'bg-green-500' : 'bg-yellow-500'}">
                            ${ad.published ? 'منتشر شده' : 'در انتظار تأیید'}
                        </span>
                    </td>
                    <td class="p-3">${typeBadge}</td>
                    <td class="p-3">${ad.createdAt ? new Date(ad.createdAt).toLocaleDateString('fa-IR') : '-'}</td>
                </tr>
            `;
        }).join('');

        $('#recent-ads-list').html(recentAdsHtml.length ? recentAdsHtml : `
            <tr>
                <td colspan="6" class="p-4 text-center text-gray-400">هیچ آگهی یافت نشد</td>
            </tr>
        `);
        
        // Prepare data for charts
        const categories = {
            'cars': 'ماشین',
            'motorcycles': 'موتور',
            'houses': 'خانه',
            'items': 'آیتم',
            'others': 'سایر'
        };
        
        const categoryCounts = {};
        Object.keys(categories).forEach(cat => {
            categoryCounts[categories[cat]] = allAds.filter(ad => ad.category === cat).length;
        });
        
        // Render category chart
        renderCategoryChart(categoryCounts);
        
        // Update last updated time
        $('#last-updated').text(new Date().toLocaleTimeString('fa-IR'));
    }

    // Get system information
    function getSystemInfo() {
        const onlineStatus = navigator.onLine ? 'آنلاین' : 'آفلاین';
        const connectionType = navigator.connection ? navigator.connection.effectiveType : 'نامشخص';
        const memory = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'نامشخص';
        
        $('#system-status').text(onlineStatus).removeClass('ping-success ping-error').addClass(onlineStatus === 'آنلاین' ? 'ping-success' : 'ping-error');
        $('#connection-type').text(connectionType);
        $('#memory-info').text(memory);
        
        // Simulate ping to local system
        const pingTime = Math.floor(Math.random() * 100) + 10; // Simulated ping
        $('#system-ping').text(`${pingTime} ms`);
        $('#system-ping').removeClass('ping-success ping-warning ping-error');
        
        if (pingTime < 50) {
            $('#system-ping').addClass('ping-success');
        } else if (pingTime < 100) {
            $('#system-ping').addClass('ping-warning');
        } else {
            $('#system-ping').addClass('ping-error');
        }
    }

    // Ping server and update status
    function pingServer(url, statusSelector, pingSelector) {
        const startTime = new Date().getTime();
        
        $(statusSelector).text('در حال بررسی...').removeClass('ping-success ping-warning ping-error');
        $(pingSelector).text('-- ms');
        
        $.ajax({
            url: url,
            method: 'GET',
            timeout: 5000
        })
        .done(() => {
            const pingTime = new Date().getTime() - startTime;
            $(pingSelector).text(`${pingTime} ms`);
            $(`${pingSelector}-bar`).css('width', `${Math.min(100, 100 - (pingTime / 20))}%`);
            
            if (pingTime < 300) {
                $(statusSelector).text('آنلاین').addClass('ping-success');
            } else if (pingTime < 800) {
                $(statusSelector).text('کند').addClass('ping-warning');
            } else {
                $(statusSelector).text('آنلاین (کند)').addClass('ping-error');
            }
        })
        .fail(() => {
            $(statusSelector).text('آفلاین').addClass('ping-error');
            $(pingSelector).text('-- ms');
            $(`${pingSelector}-bar`).css('width', '0%');
        });
    }

    // Render category chart
    function renderCategoryChart(categoryCounts) {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        // Destroy previous chart if exists
        if (categoryChart) {
            categoryChart.destroy();
        }
        
        const labels = Object.keys(categoryCounts);
        const data = Object.values(categoryCounts);
        const backgroundColors = [
            'rgba(59, 130, 246, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(168, 85, 247, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(239, 68, 68, 0.7)'
        ];
        
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: 'rgba(31, 41, 55, 0.8)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        rtl: true,
                        labels: {
                            color: '#9CA3AF',
                            font: {
                                family: 'Vazir, Tahoma, sans-serif'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Setup event handlers
    function setupEventHandlers() {
        // Edit Ad
        $('.edit-btn').click(function () {
            const adId = parseInt($(this).data('id'));
            const $btn = $(this);
            $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin ml-1"></i>در حال بارگذاری...');
            
            $.ajax({
                url: `https://still-base-3ac7.dns555104.workers.dev/api/ads/${adId}`,
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
            
            // Show confirmation modal
            $('#bulk-actions-confirm-modal').removeClass('hidden');
            $('#bulk-action-title').text('تأیید حذف آگهی');
            $('#bulk-action-message').text('آیا مطمئن هستید که می‌خواهید این آگهی را حذف کنید؟ این عمل قابل بازگشت نیست.');
            $('#bulk-action-count').text('1');
            
            $('.cancel-bulk-action').off('click').click(() => {
                $('#bulk-actions-confirm-modal').addClass('hidden');
            });
            
            $('.confirm-bulk-action').off('click').click(function() {
                const $confirmBtn = $(this);
                $confirmBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin ml-1"></i>در حال حذف...');
                
                $.ajax({
                    url: `https://still-base-3ac7.dns555104.workers.dev/api/ads/${adId}`,
                    method: 'DELETE',
                    dataType: 'json',
                    timeout: 10000
                })
                .done(() => {
                    $('#bulk-actions-confirm-modal').addClass('hidden');
                    loadAdminAds();
                    loadDashboardStats();
                    showAlert('آگهی با موفقیت حذف شد');
                })
                .fail((jqXHR) => {
                    const errorMsg = jqXHR.responseJSON?.error || 'خطا در حذف آگهی';
                    console.error('Error deleting ad:', jqXHR.responseJSON);
                    showAlert(`خطا: ${errorMsg}`, 'error');
                })
                .always(() => {
                    $confirmBtn.prop('disabled', false).html('تأیید');
                });
            });
        });

        // Publish/Unpublish Ad
        $('.publish-btn').click(function () {
            const adId = parseInt($(this).data('id'));
            const $btn = $(this);
            $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin ml-1"></i>در حال پردازش...');
            
            $.ajax({
                url: `https://still-base-3ac7.dns555104.workers.dev/api/ads/${adId}`,
                method: 'GET',
                timeout: 10000
            })
            .done((response) => {
                if (!response || !response.success || !response.data) {
                    throw new Error('آگهی مورد نظر یافت نشد');
                }
                
                const ad = response.data;
                
                $.ajax({
                    url: `https://still-base-3ac7.dns555104.workers.dev/api/ads/${adId}`,
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
                        loadDashboardStats();
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

        // View user ads
        $('.view-user-ads').click(function() {
            const playerName = $(this).data('name');
            showUserAdsModal(playerName);
        });

        // Close user ads modal
        $('.close-user-ads-modal').click(function() {
            $('#user-ads-modal').addClass('hidden');
        });

        // Checkbox change handler
        $('.ad-checkbox').change(function() {
            toggleBulkActions();
        });
        
        // Select all checkbox
        $('#select-all-ads').change(function() {
            $('.ad-checkbox').prop('checked', $(this).prop('checked'));
            toggleBulkActions();
        });
        
        // Add new user button
        $('#add-user-btn').click(function() {
            showUserModal();
        });
        
        // Edit user button
        $(document).on('click', '.edit-user-btn', function() {
            const userId = $(this).data('id');
            const user = allUsers.find(u => u.id === userId);
            if (user) {
                showUserModal(user);
            }
        });
        
        // Delete user button
        $(document).on('click', '.delete-user-btn', function() {
            const userId = $(this).data('id');
            const user = allUsers.find(u => u.id === userId);
            
            if (user) {
                $('#bulk-actions-confirm-modal').removeClass('hidden');
                $('#bulk-action-title').text('تأیید حذف کاربر');
                $('#bulk-action-message').text(`آیا مطمئن هستید که می‌خواهید کاربر "${user.name}" را حذف کنید؟ این عمل قابل بازگشت نیست.`);
                $('#bulk-action-count').text('1');
                
                $('.cancel-bulk-action').off('click').click(() => {
                    $('#bulk-actions-confirm-modal').addClass('hidden');
                });
                
                $('.confirm-bulk-action').off('click').click(function() {
                    const $confirmBtn = $(this);
                    $confirmBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin ml-1"></i>در حال حذف...');
                    
                    // Simulate API call
                    setTimeout(() => {
                        allUsers = allUsers.filter(u => u.id !== userId);
                        filterUsers();
                        $('#bulk-actions-confirm-modal').addClass('hidden');
                        showAlert('کاربر با موفقیت حذف شد');
                        $confirmBtn.prop('disabled', false).html('تأیید');
                    }, 1000);
                });
            }
        });
        
        // View all ads link
        $('#view-all-ads').click(function(e) {
            e.preventDefault();
            $('#dashboard-link').removeClass('active bg-gray-700 text-purple-400');
            $('#ads-management-link').addClass('active bg-gray-700 text-purple-400');
            $('#dashboard-section').addClass('hidden');
            $('#ads-management-section').removeClass('hidden');
        });
    }

    // Toggle bulk actions visibility
    function toggleBulkActions() {
        const checkedCount = $('.ad-checkbox:checked').length;
        if (checkedCount > 0) {
            $('.bulk-actions-dropdown').addClass('bulk-actions-active');
        } else {
            $('.bulk-actions-dropdown').removeClass('bulk-actions-active');
        }
        $('#selected-count').text(checkedCount);
    }

    // Bulk actions handler
    $(document).on('click', '.bulk-action-btn', function() {
        const action = $(this).data('action');
        const selectedIds = $('.ad-checkbox:checked').map(function() {
            return $(this).data('id');
        }).get();

        if (selectedIds.length === 0) {
            showAlert('لطفاً حداقل یک آگهی را انتخاب کنید', 'error');
            return;
        }

        const confirmMessages = {
            'publish': 'آیا مطمئن هستید که می‌خواهید آگهی‌های انتخاب شده را منتشر کنید؟',
            'unpublish': 'آیا مطمئن هستید که می‌خواهید آگهی‌های انتخاب شده را از حالت انتشار خارج کنید؟',
            'vip': 'آیا مطمئن هستید که می‌خواهید آگهی‌های انتخاب شده را به VIP ارتقا دهید؟',
            'fast': 'آیا مطمئن هستید که می‌خواهید آگهی‌های انتخاب شده را به Fast ارتقا دهید؟',
            'delete': 'آیا مطمئن هستید که می‌خواهید آگهی‌های انتخاب شده را حذف کنید؟ این عمل قابل بازگشت نیست.'
        };
        
        const actionTitles = {
            'publish': 'انتشار گروهی',
            'unpublish': 'عدم انتشار گروهی',
            'vip': 'ارتقا به VIP',
            'fast': 'ارتقا به Fast',
            'delete': 'حذف گروهی'
        };

        $('#bulk-actions-confirm-modal').removeClass('hidden');
        $('#bulk-action-title').text(actionTitles[action]);
        $('#bulk-action-message').text(confirmMessages[action]);
        $('#bulk-action-count').text(selectedIds.length);
        
        $('.cancel-bulk-action').off('click').click(() => {
            $('#bulk-actions-confirm-modal').addClass('hidden');
        });
        
        $('.confirm-bulk-action').off('click').click(function() {
            const $btn = $(this);
            $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin ml-1"></i>در حال پردازش...');
            
            const promises = selectedIds.map(id => {
                return $.ajax({
                    url: `https://still-base-3ac7.dns555104.workers.dev/api/ads/${id}`,
                    method: 'GET'
                }).then(response => {
                    if (!response || !response.success || !response.data) {
                        throw new Error('آگهی مورد نظر یافت نشد');
                    }
                    
                    const ad = response.data;
                    let updateData = { ...ad };
                    
                    if (action === 'publish') updateData.published = true;
                    if (action === 'unpublish') updateData.published = false;
                    if (action === 'vip') updateData.type = 'vip';
                    if (action === 'fast') updateData.type = 'fast';
                    
                    if (action === 'delete') {
                        return $.ajax({
                            url: `https://still-base-3ac7.dns555104.workers.dev/api/ads/${id}`,
                            method: 'DELETE'
                        });
                    } else {
                        return $.ajax({
                            url: `https://still-base-3ac7.dns555104.workers.dev/api/ads/${id}`,
                            method: 'PUT',
                            contentType: 'application/json',
                            data: JSON.stringify(updateData)
                        });
                    }
                });
            });
            
            Promise.all(promises)
                .then(() => {
                    $('#bulk-actions-confirm-modal').addClass('hidden');
                    loadAdminAds();
                    loadDashboardStats();
                    showAlert(`عملیات گروهی با موفقیت انجام شد (${selectedIds.length} آگهی)`);
                })
                .catch(error => {
                    console.error('Bulk action error:', error);
                    showAlert('خطا در انجام عملیات گروهی', 'error');
                })
                .finally(() => {
                    $btn.prop('disabled', false).html('تأیید');
                });
        });
    });

    // Add New Ad with improved validation and image handling
    $('#add-ad-btn').click(() => {
        const title = $('#ad-title').val().trim();
        const price = $('#ad-price').val().trim();
        const gameId = $('#ad-game-id').val().trim();
        const playerName = $('#ad-player-name').val().trim();
        const telegramId = $('#ad-telegram-id').val().trim();
        const referral = $('#ad-referral').val().trim();
        const description = $('#ad-description').val().trim();
        const category = $('#ad-category').val();
        const location = category === 'houses' ? $('#ad-location').val() : '';
        const type = $('input[name="ad-type"]:checked').val() || 'normal';
        const images = $('#ad-images')[0].files;

        // Client-side validation
        if (!title || !price || !description || !category || !telegramId || images.length === 0) {
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
                    telegramId,
                    referral,
                    description,
                    category,
                    location,
                    type,
                    images: imagesBase64,
                    published: false,
                    createdAt: new Date().toISOString(),
                    id: Date.now()
                };
                
                return $.ajax({
                    url: 'https://still-base-3ac7.dns555104.workers.dev/api/ads',
                    method: 'POST',
                    contentType: 'application/json',
                    dataType: 'json',
                    timeout: 10000,
                    data: JSON.stringify(newAd)
                });
            })
            .then(() => {
                // Reset form
                $('#ad-title, #ad-price, #ad-game-id, #ad-player-name, #ad-telegram-id, #ad-referral, #ad-description, #ad-images').val('');
                $('#image-preview').empty();
                $('#location-container').addClass('hidden');
                loadAdminAds();
                loadDashboardStats();
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
                    <div class="relative group">
                        <img src="${e.target.result}" class="w-full h-24 object-cover rounded-lg border border-gray-600">
                        <div class="absolute top-1 left-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">${i+1}</div>
                        <button class="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl opacity-0 group-hover:opacity-100 remove-image-btn" data-index="${i}">
                            <i class="fas fa-times text-xs"></i>
                        </button>
                    </div>
                `);
            }
            reader.readAsDataURL(files[i]);
        }
    });

    // Remove image from preview
    $(document).on('click', '.remove-image-btn', function() {
        const index = $(this).data('index');
        const files = Array.from($('#ad-images')[0].files);
                files.splice(index, 1);
        
        // Update the file input
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        $('#ad-images')[0].files = dataTransfer.files;
        
        // Remove the preview image
        $(this).parent().remove();
        
        // Update the image numbers
        $('#image-preview .relative').each(function(i) {
            $(this).find('div').text(i+1);
        });
    });

    // Handle drag and drop for images
    const dropZone = $('#drop-zone')[0];
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drop-zone-active');
    });

    ['dragleave', 'dragend'].forEach(type => {
        dropZone.addEventListener(type, () => {
            dropZone.classList.remove('drop-zone-active');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drop-zone-active');
        
        if (e.dataTransfer.files.length) {
            $('#ad-images')[0].files = e.dataTransfer.files;
            $('#ad-images').trigger('change');
        }
    });

    // Click on drop zone to trigger file input
    dropZone.addEventListener('click', () => {
        $('#ad-images').click();
    });

    // Reset form
    $('#reset-form-btn').click(() => {
        $('#ad-title, #ad-price, #ad-game-id, #ad-player-name, #ad-telegram-id, #ad-referral, #ad-description, #ad-images').val('');
        $('#image-preview').empty();
        $('#location-container').addClass('hidden');
    });

    // Close add ad form
    $('#close-add-ad-form').click(() => {
        $('#add-new-ad-section').addClass('hidden');
        $('#ads-management-link').addClass('active').addClass('bg-gray-700').addClass('text-purple-400');
        $('#add-new-ad-link').removeClass('active').removeClass('bg-gray-700').removeClass('text-purple-400');
    });

    // Navigation handlers
    $('#dashboard-link').click(function(e) {
        e.preventDefault();
        $(this).addClass('active').addClass('bg-gray-700').addClass('text-purple-400');
        $('#ads-management-link, #add-new-ad-link, #users-management-link, #settings-link').removeClass('active').removeClass('bg-gray-700').removeClass('text-purple-400');
        $('#dashboard-section').removeClass('hidden');
        $('#ads-management-section, #add-new-ad-section, #users-management-section').addClass('hidden');
    });

    $('#ads-management-link').click(function(e) {
        e.preventDefault();
        $(this).addClass('active').addClass('bg-gray-700').addClass('text-purple-400');
        $('#dashboard-link, #add-new-ad-link, #users-management-link, #settings-link').removeClass('active').removeClass('bg-gray-700').removeClass('text-purple-400');
        $('#ads-management-section').removeClass('hidden');
        $('#dashboard-section, #add-new-ad-section, #users-management-section').addClass('hidden');
    });

    $('#add-new-ad-link').click(function(e) {
        e.preventDefault();
        $(this).addClass('active').addClass('bg-gray-700').addClass('text-purple-400');
        $('#dashboard-link, #ads-management-link, #users-management-link, #settings-link').removeClass('active').removeClass('bg-gray-700').removeClass('text-purple-400');
        $('#add-new-ad-section').removeClass('hidden');
        $('#dashboard-section, #ads-management-section, #users-management-section').addClass('hidden');
    });

    $('#users-management-link').click(function(e) {
        e.preventDefault();
        $(this).addClass('active').addClass('bg-gray-700').addClass('text-purple-400');
        $('#dashboard-link, #ads-management-link, #add-new-ad-link, #settings-link').removeClass('active').removeClass('bg-gray-700').removeClass('text-purple-400');
        $('#users-management-section').removeClass('hidden');
        $('#dashboard-section, #ads-management-section, #add-new-ad-section').addClass('hidden');
    });

    $('#settings-link').click(function(e) {
        e.preventDefault();
        $(this).addClass('active').addClass('bg-gray-700').addClass('text-purple-400');
        $('#dashboard-link, #ads-management-link, #add-new-ad-link, #users-management-link').removeClass('active').removeClass('bg-gray-700').removeClass('text-purple-400');
        $('#dashboard-section, #ads-management-section, #add-new-ad-section, #users-management-section').addClass('hidden');
        showAlert('بخش تنظیمات در حال توسعه است', 'info');
    });

    // Toggle sidebar on mobile
    $('#mobile-menu-btn').click(() => {
        $('.sidebar').addClass('sidebar-open');
    });

    $('#sidebar-toggle').click(() => {
        $('.sidebar').removeClass('sidebar-open');
    });

    // Toggle password visibility
    $('#toggle-password').click(function() {
        const passwordInput = $('#admin-password');
        const icon = $(this).find('i');
        
        if (passwordInput.attr('type') === 'password') {
            passwordInput.attr('type', 'text');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            passwordInput.attr('type', 'password');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        }
    });

    // Logout handler
    $('#logout-btn').click(() => {
        $('#logout-confirm-modal').removeClass('hidden');
    });

    $('.cancel-logout').click(() => {
        $('#logout-confirm-modal').addClass('hidden');
    });

    $('.confirm-logout').click(() => {
        $('#admin-panel').addClass('hidden');
        $('#admin-login').removeClass('hidden');
        $('#logout-confirm-modal').addClass('hidden');
        showAlert('با موفقیت از سیستم خارج شدید', 'success');
    });

    // Refresh buttons
    $('#refresh-status-btn').click(() => {
        loadDashboardStats();
    });

    $('#refresh-ads').click(() => {
        loadAdminAds();
    });

    $('#refresh-users').click(() => {
        loadUsers();
    });

    // Filter change handlers
    $('#admin-category-filter, #admin-status-filter, #admin-type-filter, #admin-search').change(() => {
        currentPage = 1;
        filterAndPaginateAds();
    });

    $('#admin-search').on('input', () => {
        currentPage = 1;
        filterAndPaginateAds();
    });

    $('#users-search, #user-status-filter, #user-verified-filter').change(() => {
        filterUsers();
    });

    $('#users-search').on('input', () => {
        filterUsers();
    });

    // Pagination handlers
    $('#prev-page').click(() => {
        if (currentPage > 1) {
            currentPage--;
            filterAndPaginateAds();
        }
    });

    $('#next-page').click(() => {
        const totalPages = Math.ceil(allAds.length / adsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            filterAndPaginateAds();
        }
    });

    $(document).on('click', '.page-number', function() {
        currentPage = parseInt($(this).data('page'));
        filterAndPaginateAds();
    });

    // Clear selection
    $('#clear-selection').click(() => {
        $('.ad-checkbox').prop('checked', false);
        toggleBulkActions();
    });

    // Helper function to get category name
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