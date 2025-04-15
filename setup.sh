#!/bin/bash

# Install dependencies
sudo apt update
sudo apt install -y apache2 certbot python3-certbot-apache docker-compose

# Configure Apache
sudo a2enmod proxy proxy_http ssl rewrite headers
sudo cp apache-config/api-cui.conf /etc/apache2/sites-available/
sudo cp apache-config/ssl-params.conf /etc/apache2/conf-available/
sudo a2ensite api-cui.conf
sudo a2enconf ssl-params

# Get SSL certificates
sudo certbot --apache -d api-cui.boringtasktools.com --non-interactive --agree-tos -m admin@boringtasktools.com

# Start Docker
docker-compose up -d --build

# Restart Apache
sudo systemctl restart apache2

echo "Setup complete! Access your API at: https://api-cui.boringtasktools.com"
