// -------------------- ПРОЕКТЫ --------------------
async function loadProjects() {
    const container = document.getElementById('projects-scroll');
    const emptyPlaceholder = document.getElementById('projects-empty');

    try {
        const response = await fetch('/api/user-projects');
        const data = await response.json();

        if (!data.success || !data.projects) throw new Error('Неверный формат API');

        // Получаем активные проекты
        let activeProjects = data.projects.active || [];
        let otherProjects = [];

        // Если активных меньше 3, добираем остальные
        if (activeProjects.length < 3) {
            const statuses = ['planned','paused','completed','cancelled','archived'];
            for (const status of statuses) {
                otherProjects.push(...(data.projects[status] || []));
            }
        }

        const projectsToShow = [...activeProjects];
        if (projectsToShow.length < 3) {
            projectsToShow.push(...otherProjects.slice(0, 3 - projectsToShow.length));
        }

        container.innerHTML = '';

        if (projectsToShow.length === 0) {
            emptyPlaceholder.style.display = 'block';
            return;
        } else {
            emptyPlaceholder.style.display = 'none';
        }

        projectsToShow.forEach(proj => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <img src="${proj.cover}" alt="${proj.name}" class="project-cover">
                <div class="project-info">
                    <h3 class="project-name">${proj.name}</h3>
                    <p class="project-desc">${proj.description}</p>
                    <span class="project-status ${proj.status}">${proj.status}</span>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error('Ошибка загрузки проектов:', err);
        emptyPlaceholder.innerText = 'Ошибка сети при загрузке проектов.';
        emptyPlaceholder.style.display = 'block';
    }
}

// -------------------- ЗАДАЧИ --------------------
async function loadTasks() {
    const container = document.getElementById('tasks-scroll');
    const emptyPlaceholder = document.getElementById('tasks-empty');

    try {
        const response = await fetch('/api/tasks/all');
        const data = await response.json();

        if (!data.success || !data.tasks) throw new Error('Неверный формат API');

        const activeTasks = data.tasks.active || [];

        container.innerHTML = '';

        if (activeTasks.length === 0) {
            emptyPlaceholder.style.display = 'block';
            emptyPlaceholder.innerText = 'У вас нет активных задач.';
            return;
        } else {
            emptyPlaceholder.style.display = 'none';
        }

        activeTasks.forEach(task => {
            const card = document.createElement('div');
            const isCompleted = task.user_completed || task.status === 'completed';
            card.className = `task-horizontal ${isCompleted ? 'completed' : ''}`;

            card.innerHTML = `
                <div class="task-main">
                    <div class="task-checkbox">
                        <button class="complete-btn ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
                            <i class="${isCompleted ? 'fas fa-check-circle' : 'far fa-circle'}"></i>
                        </button>
                    </div>
                    <div class="task-content">
                        <h3>${task.name}</h3>
                        <p>${task.description || ''}</p>
                        <div class="task-project">
                            <i class="fas fa-project-diagram"></i>
                            <a href="/projects/${task.project_id}">${task.project_name}</a>
                        </div>
                    </div>
                </div>
                <div class="task-timeline">
                    <div class="time-item">
                        <i class="fas fa-play-circle"></i> <span>${task.start_at || ''}</span>
                    </div>
                    <div class="time-item">
                        <i class="fas fa-hourglass-end"></i> <span>${task.end_at || ''}</span>
                    </div>
                </div>
            `;

            const button = card.querySelector('.complete-btn');
            if (!isCompleted) {
                button.addEventListener('click', async () => {
                    await markCompleted(task.id, card, button);
                });
            }

            container.appendChild(card);
        });

    } catch (err) {
        console.error('Ошибка загрузки задач:', err);
        emptyPlaceholder.innerText = 'Ошибка сети при загрузке задач.';
        emptyPlaceholder.style.display = 'block';
    }
}

// Отметка задачи как выполненной
async function markCompleted(id, card, button) {
    try {
        const res = await fetch(`/api/tasks/${id}/complete`, { method: 'POST' });
        const data = await res.json();

        if (data.success) {
            button.classList.add('completed');
            button.querySelector('i').className = 'fas fa-check-circle';
            card.classList.add('completed');
            showNotification('Задача отмечена!');
        }
    } catch (err) {
        console.error('Ошибка:', err);
    }
}

// Всплывающие уведомления
function showNotification(message) {
    const n = document.createElement('div');
    n.className = 'notification';
    n.textContent = message;
    Object.assign(n.style, {
        position: 'fixed',
        top: '20px', right: '20px',
        background: '#06d6a0', color: 'white',
        padding: '15px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0,0,0,.2)',
        zIndex: 1000
    });
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2500);
}




// -------------------- ИНИЦИАЛИЗАЦИЯ --------------------
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    loadTasks();

    // Карусель: проекты
    const scrollProjects = document.getElementById('projects-scroll');
    document.getElementById('projects-prev').addEventListener('click', () => scrollProjects.scrollBy({ left: -300, behavior: 'smooth' }));
    document.getElementById('projects-next').addEventListener('click', () => scrollProjects.scrollBy({ left: 300, behavior: 'smooth' }));

    // Карусель: задачи
    const scrollTasks = document.getElementById('tasks-scroll');
    document.getElementById('tasks-prev').addEventListener('click', () => scrollTasks.scrollBy({ left: -300, behavior: 'smooth' }));
    document.getElementById('tasks-next').addEventListener('click', () => scrollTasks.scrollBy({ left: 300, behavior: 'smooth' }));
});
