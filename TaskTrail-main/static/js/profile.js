document.addEventListener('DOMContentLoaded', async function() {

    const profilePhoto = document.getElementById('profile-photo');
    const userIdEl = document.getElementById('user-id');
    const userFioEl = document.getElementById('user-fio');
    const userDescEl = document.getElementById('user-description');
    const userEmailEl = document.getElementById('user-email');
    const activeTasksEl = document.getElementById('active-tasks');
    const completedTasksEl = document.getElementById('completed-tasks');
    const adminPanelEl = document.getElementById('admin-panel');
    const changePhotoBtn = document.getElementById('change-photo-btn');
    const photoUpload = document.getElementById('photo-upload');

    try {
        const res = await fetch(`/api/users/me`);
        const data = await res.json();
        if (data.success) {
            const user = data.user;

            userIdEl.textContent = `#ID-${user.id}`;
            userFioEl.textContent = `${user.surname} ${user.name} ${user.patronymic || ''}`;
            userDescEl.textContent = user.description || '';
            userEmailEl.textContent = user.email;
            activeTasksEl.textContent = user.active_tasks;
            completedTasksEl.textContent = user.completed_tasks;
            if (user.photo) profilePhoto.src = user.photo;
			
			const adminPanelEl = document.getElementById('admin-panel');

            if (user.role === 'member') {
				adminPanelEl.style.display = 'none';
			} else {
				adminPanelEl.style.display = 'block';
			}

        }
    } catch (err) {
        console.error("Ошибка загрузки профиля:", err);
    }
	
	changePhotoBtn.addEventListener('click', function() {
		photoUpload.click();
	});

    photoUpload.addEventListener('change', async function(event) {
		const file = event.target.files[0];
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			showNotification('Пожалуйста, выберите файл изображения', 'error');
			return;
		}

		const reader = new FileReader();
		reader.onload = function(e) {
			profilePhoto.src = e.target.result;
		};
		reader.readAsDataURL(file);

		const formData = new FormData();
		formData.append('photo', file);

		try {
			const response = await fetch('/api/users/me', {  // <-- путь заменён
				method: 'POST',
				body: formData
			});
			const result = await response.json();

			if (result.success) {
				profilePhoto.src = result.photo; // путь с сервера
				showNotification('Фото успешно обновлено!');
			} else {
				showNotification(result.message || 'Ошибка при загрузке', 'error');
			}
		} catch (err) {
			console.error(err);
			showNotification('Ошибка соединения с сервером', 'error');
		}
	});


    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff6b6b' : '#06d6a0'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 1000;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2500);
    }
});