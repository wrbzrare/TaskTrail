import sqlite3
from werkzeug.security import generate_password_hash

USER_DATA = {
    'login': 'admin',
    'password': 'admin123!',
    'surname': 'Фамилия',
    'name': 'Имя',
    'patronymic': 'Отчество',
    'email': 'mail@gmail.com',
    'phone_number': '',
    'role': 'admin',
    'description': 'Администратор'
}

def create_admin_user():
    conn = sqlite3.connect('db/database.db')
    cursor = conn.cursor()
    
    password_hash = generate_password_hash(USER_DATA['password'])
    
    try:
        cursor.execute("""
            INSERT INTO users 
            (login, password_hash, surname, name, patronymic, email, phone_number, role, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            USER_DATA['login'], password_hash, USER_DATA['surname'], 
            USER_DATA['name'], USER_DATA['patronymic'], USER_DATA['email'],
            USER_DATA['phone_number'], USER_DATA['role'], USER_DATA['description']
        ))
        conn.commit()
        print(f"Создан аккаунт администратора.\nЛогин: {USER_DATA['login']}\nПароль: {USER_DATA['password']}")
        
    except sqlite3.IntegrityError as e:
        print(f"❌ Ошибка: {e}")
    except Exception as e:
        print(f"❌ Ошибка: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    create_admin_user()
    x = input("Нажмите Enter для завершения работы скрипта...")
