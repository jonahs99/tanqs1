deploy:
	cd tanqs; npm i
	rsync -avh --delete tanqs/ root@tanqs.net:/root/tanqs
	rsync -avh tanqs.service root@tanqs.net:/etc/systemd/system/tanqs.service
	ssh root@tanqs.net "systemctl daemon-reload && systemctl enable tanqs && systemctl restart tanqs"

