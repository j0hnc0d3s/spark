import mysql.connector
from db_connector import get_db_connection

# Connect to the database
conn = get_db_connection()

cursor = conn.cursor()

sql_files = [
    "insert_students.sql",
    "insert_lecturers.sql",
    "insert_courses.sql",
    "insert_registrations.sql"
]

def execute_sql_file(file_path, cursor, conn):
    print(f"Loading {file_path}")
    batch_size = 1000   
    batch_commands = []

    with open(file_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("--"):
                continue 
            batch_commands.append(line)

            if len(batch_commands) >= batch_size:
                for cmd in batch_commands:
                    try:
                        cursor.execute(cmd)
                    except mysql.connector.Error as err:
                        print(f"Error executing command:\n{cmd}\nError: {err}")
                conn.commit()
                batch_commands = []

    for cmd in batch_commands:
        try:
            cursor.execute(cmd)
        except mysql.connector.Error as err:
            print(f"Error executing command:\n{cmd}\nError: {err}")
    conn.commit()
    print(f"{file_path} loaded successfully!\n")



for sql_file in sql_files:
    execute_sql_file(sql_file, cursor, conn)


cursor.close()
conn.close()
print("All SQL files loaded into the database successfully!")