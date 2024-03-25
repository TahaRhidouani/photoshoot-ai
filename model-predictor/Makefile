cog:
	sudo curl -o /usr/local/bin/cog -L "https://github.com/replicate/cog/releases/latest/download/cog_$(uname -s)_$(uname -m)" & \
	sudo chmod +x /usr/local/bin/cog & \
	sudo cog run /bin/bash

push:
	cog push r8.im/tahainc/model-template

install:
	./install.sh

setup:
	bash ./stable-diffusion-webui/webui.sh -f --listen --port 7860 --api --no-download-sd-model
