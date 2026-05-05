document.addEventListener("DOMContentLoaded", function(){
	
	const navButtons = document.querySelectorAll('.admin-nav-btn');
	const tabs = document.querySelectorAll('.admin-tab');

	navButtons.forEach(button => {
		button.addEventListener('click', function () {
			const tabId = this.getAttribute('data-tab');

			navButtons.forEach(btn => btn.classList.remove('active'));
			tabs.forEach(tab => tab.classList.remove('active'));

			this.classList.add('active');
			document.getElementById(tabId).classList.add('active');
		});
	});

    const usersTbody = document.getElementById('users-tbody');
    const searchInput = document.getElementById('user-search');

    if (!usersTbody || !searchInput) return;

    let lastQuery = '';
    let debounceTimer = null;

    async function loadUsers(q='') {
        try {
            const url = '/api/admin/users' + (q ? `?q=${encodeURIComponent(q)}` : '');
            const res = await fetch(url);

            const data = await res.json();
            if (!data.success) {
                usersTbody.innerHTML = `<tr><td colspan="7">${data.message || 'Ошибка загрузки'}</td></tr>`;
                return;
            }

            renderUsers(data.users);
        } catch (err) {
            console.error(err);
            usersTbody.innerHTML = `<tr><td colspan="7">Ошибка соединения</td></tr>`;
        }
    }

    function renderUsers(users) {
        if (!users.length) {
            usersTbody.innerHTML = `<tr><td colspan="7">Ничего не найдено</td></tr>`;
            return;
        }

        usersTbody.innerHTML = users.map(u => {
            const active = u.status === 'active';
            const created = (u.created_at || '').split('.')[0];

            return `
                <tr data-user-id="${u.id}">
                    <td>#ID-${u.id}</td>
                    <td>${escapeHtml(u.full_name)}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>${escapeHtml(u.phone || '')}</td>
                    <td class="status-cell">
                        ${active ? `<span class="status-active">Активен</span>` :
                                   `<span class="status-inactive">Неактивен</span>`}
                    </td>
                    <td>${escapeHtml(created)}</td>
                    <td>
                        <label class="deactivate-checkbox">
                            <input type="checkbox" class="deactivate-input" ${active ? '' : 'checked'}>
                            <span class="checkmark"></span>
                        </label>
                    </td>
                </tr>
            `;
        }).join('');

        usersTbody.querySelectorAll('.deactivate-input').forEach(cb => {
            cb.addEventListener('change', onToggle);
        });
    }

    async function onToggle(e) {
        const tr = e.target.closest("tr");
        const userId = tr.dataset.userId;
        const active = !e.target.checked; // checked = deactivate

        try {
            const res = await fetch(`/api/admin/users/${userId}/status`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ active })
            });

            const data = await res.json();
            if (!data.success) {
                e.target.checked = !e.target.checked;
                return showNotification(data.message, "error");
            }

            const cell = tr.querySelector(".status-cell");
            cell.innerHTML = active ?
                `<span class="status-active">Активен</span>` :
                `<span class="status-inactive">Неактивен</span>`;

            showNotification("Статус обновлён");
        } catch (err) {
            console.error(err);
            e.target.checked = !e.target.checked;
            showNotification("Ошибка соединения", "error");
        }
    }

    searchInput.addEventListener("input", function(){
        const q = this.value.trim();
        if (q === lastQuery) return;
        lastQuery = q;

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => loadUsers(q), 250);
    });

    function escapeHtml(str) {
        if (!str) return "";
        return str.replace(/[&<>"]/g, c => (
            { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]
        ));
    }

    loadUsers();
	
	const addUserForm = document.getElementById('add-user-form');

    if (addUserForm) {
        addUserForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const payload = {
                login: document.getElementById('login').value.trim(),
                password: document.getElementById('password').value.trim(),
                surname: document.getElementById('last_name').value.trim(),
                name: document.getElementById('first_name').value.trim(),
                patronymic: document.getElementById('middle_name').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                description: document.getElementById('description').value.trim()
            };

            try {
                const response = await fetch('/api/admin/users/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (data.success) {
                    showNotification("Пользователь успешно создан!");
                    addUserForm.reset();
                    loadUsers();
                } else {
                    showNotification(data.message || "Ошибка создания пользователя", "error");
                }
            } catch (err) {
                console.error(err);
                showNotification("Ошибка соединения с сервером", "error");
            }
        });
    }
	
	const sqlInput = document.getElementById("sql-query");
    const runQueryBtn = document.getElementById("run-query");
    const clearQueryBtn = document.getElementById("clear-query");
    const sqlResults = document.getElementById("sql-results");
    const rowsCountEl = document.getElementById("rows-count");
    const execTimeEl = document.getElementById("execution-time");
	const btnAiGenerateSql = document.getElementById("btn-ai-generate");

    if (sqlInput && runQueryBtn && clearQueryBtn && sqlResults) {

        clearQueryBtn.addEventListener("click", () => {
            sqlInput.value = "";
            sqlResults.innerHTML = `
                <div class="empty-results">
                    <i class="fas fa-database"></i>
                    <p>Здесь будут отображаться результаты SQL запросов</p>
                </div>
            `;
            rowsCountEl.textContent = "0 строк";
            execTimeEl.textContent = "Время: 0.00s";
        });

        runQueryBtn.addEventListener("click", async () => {
            const query = sqlInput.value.trim();
            if (!query) {
                showNotification("Введите SQL запрос", "error");
                return;
            }

            try {
                const res = await fetch("/api/admin/sql/execute", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query })
                });

                const data = await res.json();

                if (!data.success) {
                    sqlResults.innerHTML = `
                        <div class="sql-error">
                            <i class="fas fa-times-circle"></i>
                            <p>${data.error}</p>
                        </div>
                    `;
                    rowsCountEl.textContent = "0 строк";
                    execTimeEl.textContent = `Время: ${data.time || 0}s`;
                    return;
                }

                if (!data.rows || data.rows.length === 0) {
                    sqlResults.innerHTML = `
                        <div class="sql-empty">
                            <i class="fas fa-check-circle"></i>
                            <p>Запрос выполнен успешно. Данных нет.</p>
                        </div>
                    `;
                    rowsCountEl.textContent = "0 строк";
                    execTimeEl.textContent = `Время: ${data.time}s`;
                    return;
                }

                sqlResults.innerHTML = createTable(data.columns, data.rows);
                rowsCountEl.textContent = `${data.rows.length} строк`;
                execTimeEl.textContent = `Время: ${data.time}s`;

            } catch (err) {
                console.error(err);
                showNotification("Ошибка соединения с сервером", "error");
            }
        });


        function createTable(columns, rows) {
            let html = `<table class="sql-table"><thead><tr>`;
            columns.forEach(col => html += `<th>${escapeHtml(col)}</th>`);
            html += `</tr></thead><tbody>`;

            rows.forEach(row => {
                html += "<tr>";
                row.forEach(cell => {
                    html += `<td>${escapeHtml(String(cell))}</td>`;
                });
                html += "</tr>";
            });

            html += "</tbody></table>";
            return html;
        }
		
		if (btnAiGenerateSql) {
			btnAiGenerateSql.addEventListener("click", async () => {
				const queryText = sqlInput.value.trim();

				if (!queryText) {
					showNotification("Сначала опишите, что нужно получить", "error");
					return;
				}

				const originalText = btnAiGenerateSql.innerHTML;
				btnAiGenerateSql.disabled = true;
				btnAiGenerateSql.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Генерируем...`;

				try {
					const res = await fetch("/api/admin/sql/generate", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							query: queryText
						})
					});

					const data = await res.json();

					if (data.success) {
						sqlInput.value = data["generated-query"];
						showNotification("SQL успешно сгенерирован ✨");
					} else {
						showNotification(data.message || "Ошибка генерации", "error");
					}

				} catch (err) {
					console.error(err);
					showNotification("Ошибка связи с сервером ИИ", "error");
				} finally {
					btnAiGenerateSql.disabled = false;
					btnAiGenerateSql.innerHTML = originalText;
				}
			});
		}
    }
	
	
	function showNotification(message, type = 'success') {
		const notification = document.createElement('div');
		notification.className = 'notification';
		notification.textContent = message;

		const backgroundColor = type === 'error' ? '#ff6b6b' : '#06d6a0';

		notification.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			background: ${backgroundColor};
			color: white;
			padding: 15px 20px;
			border-radius: 8px;
			box-shadow: 0 4px 15px rgba(0,0,0,0.2);
			z-index: 1000;
			animation: slideIn 0.3s ease;
		`;

		document.body.appendChild(notification);

		setTimeout(() => {
			notification.style.animation = 'slideOut 0.3s ease';
			setTimeout(() => {
				notification.remove();
			}, 300);
		}, 3000);
	}

	const style = document.createElement('style');
	style.textContent = `
	@keyframes slideIn {
		from { transform: translateX(100%); opacity: 0; }
		to { transform: translateX(0); opacity: 1; }
	}
	@keyframes slideOut {
		from { transform: translateX(0); opacity: 1; }
		to { transform: translateX(100%); opacity: 0; }
	}
	`;
	
document.head.appendChild(style);

});
