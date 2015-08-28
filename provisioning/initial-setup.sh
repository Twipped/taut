#!/bin/bash

cat "/vagrant/provisioning/self-promotion.txt"

echo "Copying bashrc..."
cp /vagrant/provisioning/files/bashrc /home/vagrant/.bashrc

# Setup local mysql client config
echo "Copying my.cnf..."
cp /vagrant/provisioning/files/my.cnf /home/vagrant/.my.cnf
