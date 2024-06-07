# Twitch Voting API

This is a platform I've developed for Twitch Streamers where viewers can vote on what games to stream next or claim giveaways. This project uses the following integrations: 
- Twitch API for user authentication
- StreamElements API to keep track of points that can be used on the giveaways and to cast a super vote
- Steam API to fetch game data

Below is a step-by-step guide with everything you need to configure, build and deploy this app for your own channel. I also made this [video](https://youtu.be/ykR2S6QsDOI "How to Deploy Twitch Voting API") for visual aid. The video was heavily edited to make it as short as possible so don't be surprised by how fast I went through some steps. It is completely normal for some steps to take up to a minute or two despite only taking a few seconds in the video.

## 1. Install the necessary tools

### Optionally you can edit and build the App on the deployment environment if your machine has the resources

**1.1 Install node.js** \
https://nodejs.org/en \
Leave everything as default during the setup process. (optional)

**1.2 Install Git** \
https://git-scm.com/download \
When asked, select the override default branch name option and leave it as **main**. Everything else may be left as default. (optional)

**1.3 Install text editor of choice (I recommend Visual Studio Code)** \
https://code.visualstudio.com/

## 2. Create development environment
**2.1 Clone repository** \
Click the search bar on top, type in `>Git: Clone` and press Enter. \
Paste the link (https://github.com/JustBuno/twitch-voting-api.git) and press Enter. \
Choose a directory to save the repository. \
A login window should appear if you haven't logged in yet. Sign in or create an account if you haven't already. \
Open the cloned repository.

**2.2 Create new repository on GitHub** \
Go to your profile on [GitHub](https://github.com/ "GitHub"). \
Create a new repository and name it whatever you like. \
**IMPORTANT:** Make this repository private since your credentials will be added in. \
Copy the URL of your new repository.

**2.3 Add a new remote in Visual Studio Code** \
Open a new terminal by navigating to View > Terminal. \
Change default origin to new repository.
```bash
git remote add myrepo https://github.com/yourusername/new-repository.git
```

**2.4 Configure Git if you haven't already**
```bash
git config --global user.name "Your Name"
```
```bash
git config --global user.email "your_email@example.com"
```

**2.5 Push to the new repository**
```bash
git add .
```
```bash
git commit -m "Initial commit"
```
```bash
git push myrepo main
```

**2.6 Change default remote**
```bash
git remote rename origin upstream
```
```bash
git remote rename myrepo origin
```
```bash
git branch -u origin/main
```

## 3. Create deployment environment

### The following instructions are for EC2 instances in Amazon Web Services (I highly recommend AWS free tier) but you are free to choose other platforms or even host your own home server

**NOTE: To use AWS you will have to add a payment method. AWS Free Tier is free for 12 months. Afterwards, pay-as-you-go service rates apply (which is dirt cheap) or you can choose a different plan.**

**3.1 Create an account on AWS** \
https://aws.amazon.com/free/

**3.2 Create a new EC2 Instance** \
Search and select EC2 on the search bar. \
Click on `Launch instance`. \
Name it whatever you like (example: twitch-voting-api). \
**Amazon Machine Image:** Ubuntu \
**Instance type:** t2.micro/t3.micro (Whichever is free tier eligible in your region) \
**Key pair:** Create a new one and name it whatever you like (I recommend using the name you chose for the instance). Leave everything as default and click on `Create key pair`. DO NOT CANCEL WHEN ASKED TO SAVE THE FILE. This file will be used to log in to your EC2 instance so save it somewhere memorable. \
**Network settings:** Create security group. Check all 3 `Allow traffic from` boxes. Allow SSH traffic from your IP only. If your device's IP changes, you need to change this IP to connect to your EC2 instance. \
Leave everything else as default unless you really know what you're doing.
Once you're done, click on `Launch Instance`.

**3.3 Open port for server.js** \
From the EC2 Dashboard, navigate to [Security Groups](https://eu-north-1.console.aws.amazon.com/ec2/home?#SecurityGroups: "AWS EC2 Security Groups"). \
Find the Security Group you just created. \
Give it a name to make it easier to identify. (optional) \
Click on the Security Group ID and then press `Edit inbound rules`. \
Click on `Add rule` and select the following:
- **Type:** Custom TCP
- **Port Range:** 8000
- **Source:** Anywhere IPv4

Click on `Save rules`.

**3.4 Create and attribute Elastic IP** \
From the EC2 Dashboard, navigate to [Elastic IPs](https://eu-north-1.console.aws.amazon.com/ec2/home?#Addresses: "AWS EC2 Elastic IP addresses"). \
Click on `Allocate Elastic IP address`. \
Leave everything as default and click on `Allocate`. \
Right click on your new Elastic IP and choose `Associate Elastic IP address`. \
**Instance:** Select the instance you created earlier \
**Private IP address:** Select your instance's private IP \
Check `Allow this Elastic IP address to be reassociated`. (optional) \
Click on `Associate`.

**3.5 Get the Elastic IP** \
Navigate to the [EC2 Instances](https://eu-north-1.console.aws.amazon.com/ec2/home?#Instances: "AWS EC2 Instances"). \
Click on the Instance ID. \
You will find the Elastic IP address in the Instance summary.

## 4. Create a domain for your Web App

### We're using No-IP in this guide but the setup process is pretty straightforward for most DDNS services so feel free to choose any service. I chose [No-IP](https://www.noip.com/) for the free domain options but [GoDaddy](https://www.godaddy.com/) is also a very good alternative.

[Create an account](https://www.noip.com/sign-up "Create a No-IP Dynamic DNS Account") and log in. \
Go to [Dynamic DNS](https://my.noip.com/dynamic-dns "No-IP Dynamic DNS"). \
Click on `Create Hostname`. \
Type a Hostname and select a Domain. (I used https://justbuno-api.ddns.net/) \
Paste your Elastic IP address in the `IPv4 Address` box.
Click on `Create Hostname`. \
**You now have your own domain. No-IP will notify you monthly via email to confirm you want to keep your domain up. Alternatively you can buy the domain instead of checking in every month.**

## 5. Configure deployment environment

**5.1 Connect to EC2 Instance using SSH** \
Open a Command Prompt on the folder where you saved your key pair earlier. You can do this quickly by navigating to the folder and entering `cmd` on the address bar. \
Replace path and domain, and insert into the Command Prompt.
```sh
ssh -i "C:\path\to\key\your-key.pem" ubuntu@your-domain -v
```
When asked `Are you sure you want to continue connecting (yes/no/[fingerprint])?`, type in `yes`.

**5.2 Update Ubuntu**
```sh
sudo apt update
```
```sh
sudo apt upgrade
```

**5.3 Install Nginx**
```sh
sudo apt install nginx
```

**5.4 Configure Nginx**
```sh
sudo rm /etc/nginx/sites-available/default
```
```sh
sudo nano /etc/nginx/sites-available/default
```
Paste into empty file:
```nginx
server {
	listen 80;
	server_name your-domain;

	location / {
			proxy_pass http://localhost:3000;
			proxy_http_version 1.1;
			proxy_set_header Upgrade $http_upgrade;
			proxy_set_header Connection 'upgrade';
			proxy_set_header Host $host;
			proxy_cache_bypass $http_upgrade;
	}
}
```
Do Ctrl + X to save and close file. \
Test Nginx configuration.
```sh
sudo nginx -t
```
Restart Nginx to apply changes.
```sh
sudo systemctl reload nginx
```

**5.5 Install Certbot (for free SSL certificates)** \
Install Core.
```sh
sudo snap install core
```
```sh
sudo snap refresh core
```
Only necessary if you have previously installed certbot. If in doubt, use anyway.
```sh
sudo apt remove certbot
```
Install Classic Certbot.
```sh
sudo snap install --classic certbot
```
```sh
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

**5.6 Obtain SSL certificate**
```sh
sudo certbot --nginx -d your-domain
```

**5.7 Create script to set permissions**
```sh
sudo nano /usr/local/bin/fix_cert_permissions.sh
```
Paste into empty file:
```sh
#!/bin/bash
CERT_PATH="/etc/letsencrypt/live"
ARCHIVE_PATH="/etc/letsencrypt/archive"

## Change the permissions
sudo chmod -R 755 $CERT_PATH
sudo chmod -R 755 $ARCHIVE_PATH
```

**5.8 Make script executable**
```sh
sudo chmod +x /usr/local/bin/fix_cert_permissions.sh
```
```sh
sudo nano /etc/letsencrypt/renewal/your-domain.conf
```
Paste line under `[renewalparams]`:
```conf
post_hook = /usr/local/bin/fix_cert_permissions.sh
```

**5.9 Test automatic renewal**
```sh
sudo certbot renew --dry-run
```
```sh
sudo systemctl enable snap.certbot.renew.timer
```
```sh
sudo systemctl start snap.certbot.renew.timer
```
```sh
sudo systemctl status snap.certbot.renew.timer
```

**5.10 Install nvm**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```
```bash
export NVM_DIR="$HOME/.nvm"
```
```bash
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```
```bash
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```
Check nvm installation
```sh
nvm --version
```

**5.11 Install node**
```sh
nvm install --lts
```

Check nodejs and npm installation
```sh
node --version
```
```sh
npm -v
```

**5.12 Install MySQL**
```sh
sudo apt install mysql-server
```
```sh
sudo systemctl start mysql
```
```sh
sudo systemctl enable mysql
```
```sh
sudo systemctl status mysql
```
```sh
sudo mysql_secure_installation
```
Set it as you like but I recommend choosing `2` for password validation and `y` to everything else. \
**5.13 Optimize MySQL (extremely important for low resource systems)**
```sh
sudo nano /etc/mysql/my.cnf
```
Add this to my.cnf
```cnf
[mysqld]

## Disable performance schema to reduce memory usage
performance_schema = 0

## InnoDB settings
innodb_buffer_pool_size = 32M
innodb_log_buffer_size = 1M

## Limit the number of connections
max_connections = 10

## Table open cache settings
table_open_cache = 64

## Thread cache settings
thread_cache_size = 4

## Reduce buffer sizes to save memory
sort_buffer_size = 256K
read_buffer_size = 256K
join_buffer_size = 256K
```

**5.14 Configure MySQL**
```sh
sudo mysql -u root -p
```
When asked for a password just press `Enter`.
```sql
CREATE DATABASE IF NOT EXISTS `twitch_voting_api` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```
```sql
USE `twitch_voting_api`;
```
```sql
CREATE TABLE `giveaways` ( `gameID` smallint(6) UNSIGNED NOT NULL, `appID` int(11) UNSIGNED DEFAULT NULL, `title` char(255) NOT NULL, `cover` char(255) DEFAULT NULL, `header` char(255) DEFAULT NULL, `description` text NOT NULL, `trailer` char(255) NOT NULL, `store` char(255) DEFAULT NULL, `cost` mediumint(9) UNSIGNED NOT NULL, `gameKey` char(255) NOT NULL ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; CREATE TABLE `globalVariables` ( `variable` char(255) NOT NULL, `value` tinyint(1) NOT NULL ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; CREATE TABLE `redeemedKeys` ( `id` smallint(6) UNSIGNED NOT NULL, `title` char(255) NOT NULL, `gameKey` char(255) NOT NULL, `twitchUserID` bigint(20) UNSIGNED NOT NULL ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; CREATE TABLE `users` ( `twitchUserID` bigint(20) UNSIGNED NOT NULL, `twitchUsername` char(25) NOT NULL, `gameID` bigint(20) UNSIGNED NOT NULL DEFAULT 0, `isAdmin` tinyint(1) NOT NULL DEFAULT 0 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; CREATE TABLE `voting` ( `gameID` smallint(6) UNSIGNED NOT NULL, `appID` int(11) UNSIGNED DEFAULT NULL, `title` char(255) NOT NULL, `cover` char(255) DEFAULT NULL, `header` char(255) DEFAULT NULL, `description` text NOT NULL, `trailer` char(255) NOT NULL, `store` char(255) DEFAULT NULL, `isActive` tinyint(1) NOT NULL, `voteCount` smallint(5) UNSIGNED NOT NULL DEFAULT 0, `totalVoteCount` mediumint(8) UNSIGNED NOT NULL DEFAULT 0, `superVoted` tinyint(1) NOT NULL DEFAULT 0 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; ALTER TABLE `giveaways` ADD PRIMARY KEY (`gameID`), ADD UNIQUE KEY `gameKey` (`gameKey`) USING BTREE; ALTER TABLE `globalVariables` ADD PRIMARY KEY (`variable`); ALTER TABLE `redeemedKeys` ADD PRIMARY KEY (`id`) USING BTREE, ADD UNIQUE KEY `gameKey` (`gameKey`) USING BTREE; ALTER TABLE `users` ADD PRIMARY KEY (`twitchUserID`) USING BTREE; ALTER TABLE `voting` ADD PRIMARY KEY (`gameID`); ALTER TABLE `giveaways` MODIFY `gameID` smallint(6) UNSIGNED NOT NULL AUTO_INCREMENT; ALTER TABLE `redeemedKeys` MODIFY `id` smallint(6) UNSIGNED NOT NULL AUTO_INCREMENT; ALTER TABLE `voting` MODIFY `gameID` smallint(6) UNSIGNED NOT NULL AUTO_INCREMENT;
```
```sql
COMMIT;
```
Create your own MySQL user and password. Replace `mysql-user` and `mysql-password`.
```sql
CREATE USER 'mysql-user'@'localhost' IDENTIFIED BY 'mysql-password';
```
```sql
GRANT ALL PRIVILEGES ON twitch_voting_api.* TO 'mysql-user'@'localhost';
```
```sql
exit;
```
**5.15 Reboot to apply all changes**
```sh
sudo reboot
```
### Keep your Command Prompt open in the background, we'll get back to it later.

## 6. Register your App on Twitch Developers
Log in to https://dev.twitch.tv/ \
Click on `Your Console`. \
Click on `Register Your Application`.
- **Name:** This is the name users will see when they authorize your App.
- **OAuth Redirect URLs:** https://your-domain/auth/ (example: https://justbuno-api.ddns.net/auth/)
- **Category:** Website Integration
- **Client Type:** Confidential

Click on `Create`.

## 7. Configure StreamElements
Log in with Twitch on [StreamElements](https://streamelements.com/login "StreamElements Login"). \
Click on `Loyalty > Loyalty Settings`. \
Enable Loyalty.
### This is literally all you need to set up for the StreamElements integration to work but I do highly recommend you spend some time exploring what StreamElements has to offer if you want to improve your viewers' experience even further. I also go over the more essential features and settings I personally use on the video guide.

## 8. Configure and build App
**8.1 Configure App with your credentials** \
Open project on Visual Studio Code. \
Bring up the file Explorer on the sidebar or by pressing Ctrl + Shift + E. \
Edit the following files:

### public/index.html (optional):
Replace text with whatever you want users to see on the tab.
```html
<title>Twitch Voting API</title>
```

### public/manifest.json (optional):
Replace text with whatever name you want users to see if they install your Web App on their devices.
```json
"short_name": "Twitch Voting API",
"name": "Twitch Voting API",
```

### src/constants.js:
Replace with the domain you created earlier.
```js
export const HOME = 'https://your-domain';
export const SERVER = 'https://your-domain:8000';
```
Example:
```js
export const HOME = 'https://justbuno-api.ddns.net';
export const SERVER = 'https://justbuno-api.ddns.net:8000';
```

Replace the following with your [StreamElements Account ID](https://streamelements.com/dashboard/account/channels "StreamElements Account Settings").
```js
export const STREAMELEMENTS_CHANNEL_ID = 'account-id'
```

### .env:
Go to [Twitch Developer Console](https://dev.twitch.tv/console "Twitch Developer Console") and click `Manage` on your Application. \
Get `Client Secret` and `Client ID` from your App and insert them into the .env file.
```sh
TWITCH_CLIENT_SECRET=client-secret
CLIENT_ID=client-id
```

Replace with your Twitch Channel ID. You can find the ID using [this tool](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/ "Convert Twitch Username to User ID").
```sh
BROADCASTER_ID=twitch-channel-id
```

Get `Account ID` and `JWT Token` from your [StreamElements Account](https://streamelements.com/dashboard/account/channels "StreamElements Channels").

```sh
STREAMELEMENTS_CHANNEL_ID=account-id
STREAMELEMENTS_JWT_TOKEN=jwt-token
```

Insert the domain you created earlier.

```sh
REDIRECT_URI=https://your-domain/auth/
ALLOWED_ORIGINS=https://your-domain
CERT_DIR=/etc/letsencrypt/live/your-domain/
```

Insert your mysql credentials.

```sh
MYSQL_USER=mysql-user
MYSQL_PASSWORD=mysql-password
```

Define the cost of the Super Vote. The Super Vote allows a user to choose the winning game and instantly close voting for all users at the expense of their StreamElements points. Set it to 0 if you want to disable this feature.

```sh
SUPER_VOTE_COST=100000
```

**8.2 Build App**
```sh
npm run build
```
Go to Source Control on the sidebar or press Ctrl + Shift + G. \
Type in a message for the commit. (Example: new build) \
Click on `Commit` and then `Sync Changes`.

## 9. Deploy App

### Go back to the Command Prompt and connect to your EC2 instance. If necessary, follow the instructions on step 5.

**9.1 Install Git**
```sh
sudo apt install git
```

**9.2 Configure Git**
```sh
git config --global user.name "Your Name"
```
```sh
git config --global user.email "your_email@example.com"
```

**9.3 Create SSH Key** \
You will be asked for a path, password and password confirmation. Press `Enter` on all 3 for defaults.
```sh
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

Start the SSH agent.
```sh
eval "$(ssh-agent -s)"
```

Add SSH Key to SSH agent.
```sh
ssh-add ~/.ssh/id_rsa
```

Display SSH Key.
```sh
cat ~/.ssh/id_rsa.pub
```
Copy the SSH Key.

**9.4 Add SSH Key to GitHub Account** \
Go to your GitHub account settings, navigate to the [SSH and GPG Keys](https://github.com/settings/keys "SSH and GPG Keys") section, and click on [New SSH Key](https://github.com/settings/ssh/new "Add new SSH Key").
Choose a title, paste in your SSH Key and click on `Add SSH Key`.

**9.5 Clone your private repository using SSH**
```sh
cd ~
```
Replace `your-private-repository` with the one you created on step 2.2.
```sh
git clone git@github.com:user/your-private-repository.git
```

**9.6 Test cloned repository**
```sh
cd twitch-voting-api
```
```sh
node server.js
```
The output should look like this:
```
Server is running on port 8000
```
Press Ctrl + C to close node.

**9.7 Install pm2 (Process Manager for Node.js)**
```sh
npm install -g pm2
```

**9.8 Start App using pm2** \
Add files to Process Manager.
```sh
pm2 start server.js
```
```sh
pm2 serve build 3000 --spa --name app
```
Save changes.
```sh
pm2 save
```
Configure pm2 to start processes automatically.
```sh
pm2 startup
```

The output should look something like this. Copy and paste from the terminal to save startup configuration.
```
sudo env PATH=$PATH:/home/ubuntu/.nvm/versions/node/v20.13.1/bin /home/ubuntu/.nvm/versions/node/v20.13.1/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

## 10. Enjoy your new Web App
Open your browser of choice, navigate to your domain and start adding games to the list!
