#!/bin/bash
sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO 'loopie'@'localhost'; FLUSH PRIVILEGES;"
sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO 'loopie'@'%'; FLUSH PRIVILEGES;"
