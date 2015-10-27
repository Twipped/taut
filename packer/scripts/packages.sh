#!/usr/bin/env bash

hostnamectl set-hostname taut.dev

# Add Oracle Java ppa
add-apt-repository ppa:webupd8team/java

# Add Elasticsearch deb lookup
wget -qO - https://packages.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb http://packages.elastic.co/elasticsearch/1.7/debian stable main" | sudo tee -a /etc/apt/sources.list.d/elasticsearch-1.7.list

# Add Nodesource deb lookup
wget -qO- https://deb.nodesource.com/setup_4.x | sudo bash -

# Previous step reloads apt-get cache. Lets upgrade any missing deps
apt-get -y upgrade

# Install node 4
apt-get -y install nodejs
npm install -g npm@3

# Configure mysql root password and install mysql
debconf-set-selections <<< 'mysql-server mysql-server/root_password password vagrant'
debconf-set-selections <<< 'mysql-server mysql-server/root_password_again password vagrant'
apt-get install -y mysql-client-5.6 mysql-server-5.6

# Setup vagrant mysql user
mysql -uroot -pvagrant -e "CREATE USER 'vagrant'@'%' IDENTIFIED BY 'vagrant';GRANT ALL PRIVILEGES ON *.* TO 'vagrant'@'%';FLUSH PRIVILEGES"

#apt-get install -y nginx
#apt-get install -y imagemagick

apt-get install -y redis-server
# copy over redis config that does not bind to localhost
cp /tmp/redis.conf /etc/redis/redis.conf

# Configure oracle license opt-in and install java
debconf-set-selections <<< 'debconf shared/accepted-oracle-license-v1-1 select true'
debconf-set-selections <<< 'debconf shared/accepted-oracle-license-v1-1 seen true'
apt-get install -y oracle-java7-installer

apt-get install -y elasticsearch
sudo update-rc.d elasticsearch defaults 95 10
sudo /bin/systemctl daemon-reload
sudo /bin/systemctl enable elasticsearch.service
sudo /bin/systemctl start elasticsearch.service

# Install elastichq plugin
#sudo /usr/share/elasticsearch/bin/plugin --install royrusso/elasticsearch-HQ
