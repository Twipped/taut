#!/bin/bash

cat "/vagrant/provisioning/self-promotion.txt"

echo "Copying bashrc..."
cp /vagrant/provisioning/files/bashrc /home/vagrant/.bashrc

# Setup local mysql client config
echo "Copying my.cnf client config..."
cp /vagrant/provisioning/files/my.cnf /home/vagrant/.my.cnf

echo "Copying mysqld bind-address override..."
cp /vagrant/provisioning/files/z-bindall.cnf /etc/mysql/mysql.conf.d/z-bindall.cnf
sudo service mysql restart

DATABASE_EXISTS=`mysql --defaults-extra-file=/home/vagrant/.my.cnf mysql -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'taut'" | grep 'taut'`
if [[ ! $DATABASE_EXISTS ]]; then
	echo "Create database in mysql."
	mysql --defaults-extra-file=/home/vagrant/.my.cnf mysql -e "CREATE DATABASE taut"
	mysql --defaults-extra-file=/home/vagrant/.my.cnf taut < /vagrant/provisioning/files/taut.sql
fi