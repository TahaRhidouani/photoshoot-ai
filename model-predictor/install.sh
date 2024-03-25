#!/bin/bash

# install A1111's stable-diffusion-webui
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git

# move updated webui script to correct directory
mv webui.sh stable-diffusion-webui/webui.sh

# install extensions
git clone https://github.com/Mikubill/sd-webui-controlnet.git stable-diffusion-webui/extensions/sd-webui-controlnet
git clone https://github.com/Bing-su/adetailer.git stable-diffusion-webui/extensions/adetailer

# install controlnet models
mkdir -p "stable-diffusion-webui/extensions/sd-webui-controlnet/models"
wget -O "stable-diffusion-webui/extensions/sd-webui-controlnet/models/control_v11p_sd15_openpose.pth" "https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_openpose.pth"
wget -O "stable-diffusion-webui/extensions/sd-webui-controlnet/models/t2iadapter_openpose_sd14v1.safetensors" "https://huggingface.co/webui/ControlNet-modules-safetensors/resolve/main/t2iadapter_openpose-fp16.safetensors"

# install dependencies
mkdir -p "stable-diffusion-webui/models/ESRGAN"
wget -O "stable-diffusion-webui/models/ESRGAN/ESRGAN_4x.pth" "https://github.com/cszn/KAIR/releases/download/v1.0/ESRGAN.pth"
wget -O "stable-diffusion-webui/models/GFPGAN/parsing_parsenet.pth" "https://github.com/xinntao/facexlib/releases/download/v0.2.2/parsing_parsenet.pth"
mkdir -p "stable-diffusion-webui/models/GFPGAN"
wget -O "stable-diffusion-webui/models/GFPGAN/GFPGANv1.4.pth" "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth"
wget -O "stable-diffusion-webui/models/GFPGAN/detection_Resnet50_Final.pth" "https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth"
wget -O "stable-diffusion-webui/models/GFPGAN/parsing_parsenet.pth" "https://github.com/xinntao/facexlib/releases/download/v0.2.2/parsing_parsenet.pth"
mkdir -p "stable-diffusion-webui/extensions/sd-webui-controlnet/annotator/downloads/openpose"
wget -O "stable-diffusion-webui/extensions/sd-webui-controlnet/annotator/downloads/openpose/body_pose_model.pth" "https://huggingface.co/lllyasviel/Annotators/resolve/main/body_pose_model.pth"
wget -O "stable-diffusion-webui/extensions/sd-webui-controlnet/annotator/downloads/openpose/hand_pose_model.pth" "https://huggingface.co/lllyasviel/Annotators/resolve/main/hand_pose_model.pth"
wget -O "stable-diffusion-webui/extensions/sd-webui-controlnet/annotator/downloads/openpose/facenet.pth" "https://huggingface.co/lllyasviel/Annotators/resolve/main/facenet.pth"


# install lora models
mkdir "stable-diffusion-webui/models/Lora" && wget -O "stable-diffusion-webui/models/Lora/epiNoiseoffset_v2.safetensors" "https://civitai.com/api/download/models/16576"