
#Primero debemos levantar el docker para que la base de datos quede operativa.
levantar docker:
docker-compose build app
docker-compose up

#Ejecutamos la migraciones que necesitamos para crear tablas y linkiarlas a nuestro modelo
migraciones:
npx sequelize-cli db:migrate
npx sequelize-cli db:migrate:undo

#Realizamos un SEED de las tablas actuales
Inicializacion de datos:
npx sequelize-cli db:seed
npx sequelize-cli db:seed:undo