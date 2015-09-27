#!/usr/bin/env bash

hostnamectl set-hostname finn.dev

# Add Oracle Java ppa
add-apt-repository ppa:webupd8team/java

wget -qO - https://packages.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb http://packages.elastic.co/elasticsearch/1.6/debian stable main" | sudo tee -a /etc/apt/sources.list.d/elasticsearch-1.6.list

# Reload apt cache and upgrade any missing deps
apt-get update
apt-get -y upgrade

# Install nvm and node 0.10
sudo su vagrant -c 'curl https://raw.githubusercontent.com/creationix/nvm/v0.27.1/install.sh | bash'
sudo su vagrant -c '. ~vagrant/.nvm/nvm.sh;nvm install v4'
sudo su vagrant -c '. ~vagrant/.nvm/nvm.sh;nvm alias default v4'
sudo su vagrant -c '. ~vagrant/.nvm/nvm.sh;npm install -g nodeunit'

# Configure mysql root password and install mysql
debconf-set-selections <<< 'mysql-server mysql-server/root_password password vagrant'
debconf-set-selections <<< 'mysql-server mysql-server/root_password_again password vagrant'
apt-get install -y mysql-client mysql-server

# Setup vagrant mysql user
mysql -uroot -pvagrant -e "CREATE USER 'vagrant'@'%' IDENTIFIED BY 'vagrant';GRANT ALL PRIVILEGES ON *.* TO 'vagrant'@'%';FLUSH PRIVILEGES"

#apt-get install -y nginx
apt-get install -y imagemagick

apt-get install -y redis-server
# copy over redis config that does not bind to localhost
cp /tmp/redis.conf /etc/redis/redis.conf

# Configure oracle license opt-in and install java
debconf-set-selections <<< 'debconf shared/accepted-oracle-license-v1-1 select true'
debconf-set-selections <<< 'debconf shared/accepted-oracle-license-v1-1 seen true'
apt-get install -y oracle-java7-installer

apt-get install -y elasticsearch
sudo update-rc.d elasticsearch defaults 95 10

# Install elastichq plugin
sudo /usr/share/elasticsearch/bin/plugin --install royrusso/elasticsearch-HQ