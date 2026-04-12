import mysql.connector

def get_db_connection():
    connection = mysql.connector.connect(
        host="localhost",
        user="username",
        password="password",
        database="spark_cms"
    )
    return connection