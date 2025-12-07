document.addEventListener("DOMContentLoaded", async () => {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const projectId = pathParts[pathParts.length - 1];
    if (!projectId) return console.error("Project ID не найден!");

    const btnAddTask = document.getElementById("btn-add-task");
    const modalAddTask = document.getElementById("modal-add-task");
    const createTaskSubmit = document.getElementById("create-task-submit");
    const createTaskCancel = document.getElementById("create-task-cancel");
    const newTaskName = document.getElementById("new-task-name");
    const newTaskDesc = document.getElementById("new-task-desc");
    const newTaskStatus = document.getElementById("new-task-status");
	const newTaskStart = document.getElementById("new-task-start");
	const newTaskEnd = document.getElementById("new-task-end");


    const modalAssign = document.getElementById("modal-assign-user");
    const assignUserSubmit = document.getElementById("assign-user-submit");
    const assignUserCancel = document.getElementById("assign-user-cancel");
    const assignUserIdInput = document.getElementById("assign-user-id");
    let lastAssignTaskId = null;

    // ---------- Загрузка данных проекта ----------
    let isCreator = false;
    try {
        const projectRes = await fetch(`/api/projects/${projectId}`);
        const projectData = await projectRes.json();
        if (projectData.success) {
            const project = projectData.project;
            document.querySelector(".project-info-large h1").textContent = project.name;
            document.querySelector(".project-info-large .project-description").textContent = project.description;
            if (project.cover) document.querySelector(".cover-image").style.backgroundImage = `url('/${project.cover}')`;
            isCreator = project.is_creator;
            if (isCreator) btnAddTask.style.display = "inline-block";
        }
    } catch (err) { console.error(err); }

    await loadTasks();

    async function loadTasks() {
        try {
            const res = await fetch(`/api/projects/${projectId}/tasks`);
            const data = await res.json();
            if (!data.success) return console.error("Ошибка загрузки задач");
            renderTasks(data.tasks);
        } catch (err) { console.error(err); }
    }

    function renderTasks(grouped) {
        const categories = {};
        document.querySelectorAll(".tasks-category").forEach(section => {
            const status = section.dataset.status;
            const list = section.querySelector(".tasks-list");
            if (status && list) categories[status] = list;
        });
        Object.values(categories).forEach(el => el.innerHTML = "");

        for (const status in grouped) {
            if (!categories[status]) continue;
            grouped[status].forEach(task => categories[status].appendChild(buildTaskCard(task)));
        }
    }

    function buildTaskCard(task) {
        const card = document.createElement("div");
        const isCompleted = task.user_completed || task.status === "completed";
        card.className = "task-card" + (isCompleted ? " completed" : "");
        card.dataset.taskId = task.id;

        card.innerHTML = `
            <div class="task-main">
                <div class="task-checkbox">
                    <button class="complete-btn ${isCompleted ? "completed" : ""}" data-id="${task.id}">
                        <i class="${isCompleted ? "fas fa-check-circle" : "far fa-circle"}"></i>
                    </button>
                </div>
                <div class="task-content">
                    <h3>${task.name}</h3>
                    <p>${task.description || ""}</p>
                </div>
                ${isCreator ? `<div class="task-controls" style="margin-left:10px; display:flex; flex-direction:column; gap:6px;">
                    <select class="status-select" title="Сменить глобальный статус">
                        <option value="">Сменить статус</option>
                        <option value="planned">Запланирована</option>
                        <option value="active">Активна</option>
                        <option value="paused">Заморожена</option>
                        <option value="completed">Выполнена</option>
                        <option value="cancelled">Отменена</option>
                        <option value="archived">Архив</option>
                    </select>
                    <button class="assign-user-btn btn" style="padding:6px 8px;">Добавить пользователя</button>
                </div>` : ""}
            </div>
            <div class="task-timeline">
                <div class="time-item"><i class="fas fa-play-circle"></i> <span>${task.start_at || ""}</span></div>
                <div class="time-item"><i class="fas fa-hourglass-end"></i> <span>${task.end_at || ""}</span></div>
            </div>
        `;

        const button = card.querySelector(".complete-btn");
        if (!isCompleted) button.addEventListener("click", async () => markCompleted(task.id, card, button));

        if (isCreator) {
            card.querySelector(".status-select").addEventListener("change", async e => {
                const newStatus = e.target.value; 
                if (!newStatus) return;
                await updateTaskStatus(task.id, newStatus);
                await loadTasks();
            });
            card.querySelector(".assign-user-btn").addEventListener("click", () => {
                lastAssignTaskId = task.id;
                assignUserIdInput.value = "";
                showModal(modalAssign);
            });
        }

        return card;
    }

    async function markCompleted(taskId, card, button) {
        try {
            const res = await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" });
            const data = await res.json();
            if (data.success) {
                button.classList.add("completed");
                button.querySelector("i").className = "fas fa-check-circle";
                card.classList.add("completed");
                showNotification("Задача отмечена!");
            }
        } catch (err) { console.error(err); }
    }

    async function updateTaskStatus(taskId, newStatus) {
        try {
            const res = await fetch(`/api/tasks/${taskId}/update_status`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) showNotification("Статус обновлён");
            else showNotification("Ошибка: " + (data.message || ""));
        } catch (err) { console.error(err); }
    }

    assignUserSubmit.addEventListener("click", async () => {
        const userId = parseInt(assignUserIdInput.value, 10);
        if (!userId || !lastAssignTaskId) return showNotification("Введите корректный ID");
        try {
            const res = await fetch(`/api/tasks/${lastAssignTaskId}/assign`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });
            const data = await res.json();
            if (res.status === 201 && data.success) {
                showNotification("Пользователь назначен");
                hideModal(modalAssign);
                await loadTasks();
            } else showNotification("Ошибка: " + (data.message || ""));
        } catch (err) { console.error(err); }
    });

    assignUserCancel.addEventListener("click", () => hideModal(modalAssign));
	
	const now = new Date();
	const local = now.toISOString().slice(0, 16);

	newTaskStart.value = local;
	newTaskEnd.value = "";

    btnAddTask.addEventListener("click", () => {
        showModal(modalAddTask);
        newTaskName.value = "";
        newTaskDesc.value = "";
        newTaskStatus.value = "planned";
    });
    createTaskCancel.addEventListener("click", () => hideModal(modalAddTask));
    createTaskSubmit.addEventListener("click", async () => {
        const name = newTaskName.value.trim();
        if (!name) return showNotification("Введите название задачи");
        try {
            const res = await fetch(`/api/projects/${projectId}/tasks/create`, {
                method: "POST",
                headers: { 'Content-Type':'application/json' },
                body: JSON.stringify({
				name: name,
				description: newTaskDesc.value,
				status: newTaskStatus.value,
				start_at: newTaskStart.value ? newTaskStart.value.replace("T", " ") + ":00" : null,
				end_at: newTaskEnd.value ? newTaskEnd.value.replace("T", " ") + ":00" : null
				})
            });
            const data = await res.json();
            if ((res.status === 201 || data.success) && data.success) {
                hideModal(modalAddTask);
                showNotification("Задача создана");
                await loadTasks();
            } else showNotification("Ошибка: " + (data.message || ""));
        } catch (err) { console.error(err); }
    });

    function showModal(modal) { if (modal) modal.style.display = "flex"; }
    function hideModal(modal) { if (modal) modal.style.display = "none"; }
    document.querySelectorAll(".modal").forEach(m => m.addEventListener("click", e => { if(e.target===m) hideModal(m); }));

    function showNotification(message) {
        const n = document.createElement("div");
        n.className = "notification";
        n.textContent = message;
        Object.assign(n.style, { position:"fixed", top:"20px", right:"20px", background:"#06d6a0", color:"white", padding:"15px 20px", borderRadius:"8px", boxShadow:"0 4px 15px rgba(0,0,0,.2)", zIndex:1000 });
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 2500);
    }
});
