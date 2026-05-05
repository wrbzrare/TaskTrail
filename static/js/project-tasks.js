document.addEventListener("DOMContentLoaded", async () => {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const projectId = pathParts[pathParts.length - 1];
    if (!projectId) return console.error("Project ID не найден!");

    const btnAddTask = document.getElementById("btn-add-task");
    const modalAddTask = document.getElementById("modal-add-task");
    const modalAssign = document.getElementById("modal-assign-user");
	
	const modalTaskStatus = document.getElementById("modal-task-status");
	const taskStatusList = document.getElementById("task-status-list");
	const taskStatusClose = document.getElementById("task-status-close");

    const newTaskName = document.getElementById("new-task-name");
    const newTaskDesc = document.getElementById("new-task-desc");
    const newTaskStatus = document.getElementById("new-task-status");
    const newTaskStart = document.getElementById("new-task-start");
    const newTaskEnd = document.getElementById("new-task-end");

    const createTaskSubmit = document.getElementById("create-task-submit");
    const createTaskCancel = document.getElementById("create-task-cancel");
    const btnAiGenerate = document.getElementById("btn-ai-generate");

    const assignSearchInput = document.getElementById("assign-search-input");
    const assignUsersList = document.getElementById("assign-users-list");
    const assignSubmitBtn = document.getElementById("assign-user-submit");
    const assignCancelBtn = document.getElementById("assign-user-cancel");

    const selectedUserInfo = document.getElementById("selected-user-info");
    const selectedPhoto = document.getElementById("selected-photo");
    const selectedName = document.getElementById("selected-name");
    const selectedIdSpan = document.getElementById("selected-id");

    let lastAssignTaskId = null;
    let selectedUserId = null;
    let isCreator = false;

    try {
        const projectRes = await fetch(`/api/projects/${projectId}`);
        const projectData = await projectRes.json();
        if (projectData.success) {
            const project = projectData.project;
            document.querySelector(".project-info-large h1").textContent = project.name;
            document.querySelector(".project-info-large .project-description").textContent = project.description || "";
            if (project.cover) {
                document.querySelector(".cover-image").style.backgroundImage = `url('/${project.cover}')`;
            }
            isCreator = project.is_creator;
            if (isCreator) btnAddTask.style.display = "inline-block";
        }
    } catch (err) {
        console.error("Ошибка загрузки проекта:", err);
    }

    await loadTasks();

    if (btnAiGenerate) {
        btnAiGenerate.addEventListener("click", async () => {
            const name = newTaskName.value.trim();
            if (!name) {
                showNotification("Сначала введите название задачи", "error");
                return;
            }

            const originalText = btnAiGenerate.innerHTML;
            btnAiGenerate.disabled = true;
            btnAiGenerate.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Генерируем...`;

            try {
                const res = await fetch("/api/tasks/generate-description", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: name,
                        description: newTaskDesc.value.trim()
                    })
                });

                const data = await res.json();

                if (data.success) {
                    newTaskDesc.value = data.detailed_description;
                    showNotification("Описание успешно расширено ИИ ✨");
                } else {
                    showNotification(data.message || "Не удалось получить ответ от ИИ", "error");
                }
            } catch (err) {
                console.error(err);
                showNotification("Ошибка связи с сервером ИИ", "error");
            } finally {
                btnAiGenerate.disabled = false;
                btnAiGenerate.innerHTML = originalText;
            }
        });
    }

    async function loadTasks() {
        try {
            const res = await fetch(`/api/projects/${projectId}/tasks`);
            const data = await res.json();
            if (!data.success) return console.error("Ошибка загрузки задач");
            renderTasks(data.tasks);
        } catch (err) {
            console.error(err);
        }
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
            grouped[status].forEach(task => {
                categories[status].appendChild(buildTaskCard(task));
            });
        }
    }

    function buildTaskCard(task) {
        const card = document.createElement("div");
        const isCompleted = task.user_completed || task.status === "completed";
        card.className = `task-card ${isCompleted ? "completed" : ""}`;
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
                ${isCreator ? `
                <div class="task-controls" style="margin-left:10px; display:flex; flex-direction:column; gap:6px;">
                    <select class="status-select" title="Сменить статус">
                        <option value="">Сменить статус</option>
                        <option value="planned">Запланирована</option>
                        <option value="active">Активна</option>
                        <option value="paused">Заморожена</option>
                        <option value="completed">Выполнена</option>
                        <option value="cancelled">Отменена</option>
                        <option value="archived">Архив</option>
                    </select>
                    <button class="assign-user-btn btn" style="padding:6px 8px;">Назначить</button>
					<button class="task-status-btn btn" style="padding:6px 8px;">Статус</button>
                </div>` : ""}
            </div>
            <div class="task-timeline">
                <div class="time-item"><i class="fas fa-play-circle"></i> <span>${task.start_at || "—"}</span></div>
                <div class="time-item"><i class="fas fa-hourglass-end"></i> <span>${task.end_at || "—"}</span></div>
            </div>
        `;

        const completeBtn = card.querySelector(".complete-btn");
        if (!isCompleted && completeBtn) {
            completeBtn.addEventListener("click", () => markCompleted(task.id, card, completeBtn));
        }

        if (isCreator) {
            const statusSelect = card.querySelector(".status-select");
            const assignBtn = card.querySelector(".assign-user-btn");
			const statusBtn = card.querySelector(".task-status-btn");

            if (statusSelect) {
                statusSelect.addEventListener("change", async (e) => {
                    const newStatus = e.target.value;
                    if (!newStatus) return;
                    await updateTaskStatus(task.id, newStatus);
                    await loadTasks();
                });
            }

            if (assignBtn) {
                assignBtn.addEventListener("click", () => {
                    openAssignModal(task.id);   // ← Новая функция
                });
            }
			
			if (statusBtn) {
				statusBtn.addEventListener("click", () => {
					openTaskStatusModal(task.id, task.name);
				});
			}
        }

        return card;
    }
	
	async function openTaskStatusModal(taskId, taskName) {
		taskStatusList.innerHTML = "Загрузка...";
		document.getElementById("status-task-title").textContent = `Статус: ${taskName}`;

		showModal(modalTaskStatus);

		try {
			const res = await fetch(`/api/tasks/${taskId}/assignees`);
			const data = await res.json();

			if (!data.success) {
				taskStatusList.innerHTML = `<p style="color:red;">Ошибка загрузки</p>`;
				return;
			}

			if (data.assignees.length === 0) {
				taskStatusList.innerHTML = `<p style="color:#999;">Нет назначенных пользователей</p>`;
				return;
			}

			taskStatusList.innerHTML = data.assignees.map(user => `
				<div style="display:flex; align-items:center; gap:12px; padding:10px; border-bottom:1px solid #eee;">
					<img src="/${user.photo}" style="width:42px;height:42px;border-radius:50%;">
					
					<div style="flex:1;">
						<strong>${user.full_name}</strong><br>
						<small style="color:#666;">
							${formatStatus(user.status)}
						</small>
					</div>

					<div style="font-size:12px; color:#888;">
						${user.completed_at || ""}
					</div>
				</div>
			`).join("");

		} catch (err) {
			console.error(err);
			taskStatusList.innerHTML = `<p style="color:red;">Ошибка сервера</p>`;
		}
	}
	
	function formatStatus(status) {
		switch (status) {
			case "completed": return "✅ Выполнено";
			case "in_progress": return "⏳ В процессе";
			case "pending": return "🕒 Ожидает";
			default: return status;
		}
	}

    async function markCompleted(taskId, card, button) {
        try {
            const res = await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" });
            const data = await res.json();
            if (data.success) {
                button.classList.add("completed");
                button.querySelector("i").className = "fas fa-check-circle";
                card.classList.add("completed");
                showNotification("Задача отмечена как выполненная!");
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function updateTaskStatus(taskId, newStatus) {
        try {
            const res = await fetch(`/api/tasks/${taskId}/update_status`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                showNotification("Статус задачи обновлён");
            } else {
                showNotification("Ошибка: " + (data.message || ""));
            }
        } catch (err) {
            console.error(err);
        }
    }

    function openAssignModal(taskId) {
        lastAssignTaskId = taskId;
        selectedUserId = null;
        assignSearchInput.value = "";
        selectedUserInfo.style.display = "none";
        assignSubmitBtn.disabled = true;
        assignUsersList.innerHTML = "";
        assignUsersList.classList.remove("show");
        showModal(modalAssign);
        loadAssignableUsers("");  
    }

    async function loadAssignableUsers(query) {
        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();

            if (!data.success) return;

            assignUsersList.innerHTML = "";

            if (data.users.length === 0) {
                assignUsersList.innerHTML = `<div style="padding:15px;color:#999;text-align:center;">Пользователей не найдено</div>`;
                return;
            }

            data.users.forEach(user => {
                const div = document.createElement("div");
                div.className = "user-item";
                div.innerHTML = `
                    <img src="/${user.photo}" alt="${user.full_name}">
                    <div class="user-info">
                        <strong>${user.full_name}</strong><br>
                        <small>ID: ${user.id}</small>
                    </div>
                `;
                div.addEventListener("click", () => selectUser(user));
                assignUsersList.appendChild(div);
            });

            assignUsersList.classList.add("show");
        } catch (err) {
            console.error("Ошибка загрузки пользователей:", err);
        }
    }

    function selectUser(user) {
        selectedUserId = user.id;
        selectedPhoto.src = `/${user.photo}`;
        selectedName.textContent = user.full_name;
        selectedIdSpan.textContent = user.id;
        selectedUserInfo.style.display = "flex";
        assignSubmitBtn.disabled = false;
        assignUsersList.classList.remove("show");
        assignSearchInput.value = user.full_name;
    }

    // Поиск с задержкой
    let searchTimeout;
    assignSearchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadAssignableUsers(assignSearchInput.value.trim());
        }, 250);
    });

    assignSubmitBtn.addEventListener("click", async () => {
        if (!selectedUserId || !lastAssignTaskId) return;

        try {
            const res = await fetch(`/api/tasks/${lastAssignTaskId}/assign`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: selectedUserId })
            });
            const data = await res.json();

            if (data.success) {
                showNotification("Пользователь успешно назначен!");
                hideModal(modalAssign);
                await loadTasks();
            } else {
                showNotification(data.message || "Ошибка назначения", "error");
            }
        } catch (err) {
            console.error(err);
            showNotification("Ошибка сервера", "error");
        }
    });

    assignCancelBtn.addEventListener("click", () => hideModal(modalAssign));
	taskStatusClose.addEventListener("click", () => hideModal(modalTaskStatus));

    const now = new Date().toISOString().slice(0, 16);
    newTaskStart.value = now;
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
        if (!name) return showNotification("Введите название задачи", "error");

        try {
            const res = await fetch(`/api/projects/${projectId}/tasks/create`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    description: newTaskDesc.value.trim(),
                    status: newTaskStatus.value,
                    start_at: newTaskStart.value ? newTaskStart.value.replace("T", " ") + ":00" : null,
                    end_at: newTaskEnd.value ? newTaskEnd.value.replace("T", " ") + ":00" : null
                })
            });

            const data = await res.json();
            if (data.success) {
                hideModal(modalAddTask);
                showNotification("Задача успешно создана!");
                await loadTasks();
            } else {
                showNotification(data.message || "Ошибка при создании задачи", "error");
            }
        } catch (err) {
            console.error(err);
            showNotification("Ошибка сервера", "error");
        }
    });

    function showModal(modal) {
        if (modal) modal.style.display = "flex";
    }

    function hideModal(modal) {
        if (modal) modal.style.display = "none";
    }

    document.querySelectorAll(".modal").forEach(modal => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) hideModal(modal);
        });
    });

    function showNotification(message, type = "success") {
        const notification = document.createElement("div");
        notification.className = "notification";
        notification.textContent = message;
        notification.style.backgroundColor = type === "error" ? "#f44336" : "#06d6a0";
        Object.assign(notification.style, {
            position: "fixed",
            top: "20px",
            right: "20px",
            color: "white",
            padding: "15px 20px",
            borderRadius: "8px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
            zIndex: 10000
        });
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2800);
    }
});