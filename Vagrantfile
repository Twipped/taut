# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|

	# Every Vagrant virtual environment requires a box to build off of.
	config.vm.box = "finn-ubuntu1504-amd64-vbox5-r1"
	#config.vm.box_url = "http://v2vagrant.s3-website-us-east-1.amazonaws.com/v2base-ubuntu1504-amd64-vbox4326-r1.box"

	# Assign this VM to a host-only network IP, allowing you to access it
	# via the IP. Host-only networks can talk to the host machine as well as
	# any other machines on the same network, but cannot be accessed (through this
	# network interface) by any external networks.
	config.vm.network :private_network, ip: "192.168.56.160"
	config.vm.network "forwarded_port", guest:  3306, host:  3306 # mysql
	config.vm.network "forwarded_port", guest:  9200, host:  9200 # elasticsearch
	config.vm.network "forwarded_port", guest:  6380, host:  6380 # redis
	#config.vm.network "forwarded_port", guest: 11211, host: 11211 # memcached
	#config.vm.hostname = "finn.dev"

	config.vm.synced_folder "./srv", "/srv",
		nfs: true,
		:mount_options => ['actimeo=1']

	config.vm.provider :virtualbox do |virtualbox|
		virtualbox.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
		virtualbox.customize ["modifyvm", :id, "--name", "finn"]
		virtualbox.customize ["modifyvm", :id, "--memory", "2048"]
		virtualbox.customize ["setextradata", :id, "--VBoxInternal2/SharedFoldersEnableSymlinksCreate/v-root", "1"]
	end

	config.vm.provision "shell" do |s|
		s.path = "provisioning/initial-setup.sh"
		s.args = "/vagrant/provisioning"
	end


end
