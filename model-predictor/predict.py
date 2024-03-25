from cog import BasePredictor, Input, Path
from PIL import Image
from typing import Iterator
from io import BytesIO

import subprocess
import time
import random
import requests
import base64
import webuiapi


class Predictor(BasePredictor):
    def setup(self):
        print("Loading...")

        self.port = 7860
        self.daemon = subprocess.Popen(["./webui.sh", "-f", "--api", "--listen", "--port", str(self.port), "--enable-insecure-extension-access", "--no-download-sd-model", "--skip-python-version-check", "--skip-torch-cuda-test", "--opt-sdp-attention", "--disable-safe-unpickle", "--skip-version-check", "--no-hashing"], cwd="./stable-diffusion-webui")
        # -nowebui arg currently bugs out lora model

        start = time.time()
        while True:
            try:
                requests.get(f"http://localhost:{self.port}/")
                break
            except requests.exceptions.ConnectionError:
                if time.time() - start > 120:
                    raise RuntimeError("Server failed to start")
                time.sleep(1)

        print("startup complete, duration:", time.time() - start)

        time.sleep(3)

        self.api = webuiapi.WebUIApi(host='127.0.0.1', port=self.port)

    def predict(
            self,
            action: str = Input(
                default="txt2img",
                choices=[
                    "txt2img",
                    "img2img",
                ],
                description="Choose a scheduler",
            ),
            controlnet: bool = Input(
                description="Enable controlnet", default=False
            ),
            masking: bool = Input(
                description="Enable masking (only for img2img)", default=False
            ),
            prompt: str = Input(
                description="Input prompt",
                default="(portrait photo of cjw man), (City), RAW photo, bokeh, high detailed skin, 8k uhd, dslr, soft lighting, high quality, film grain, Fujifilm XT3, <lora:epiNoiseoffset_v2:1>",
            ),
            negative_prompt: str = Input(
                description="Specify things to not see in the output",
                default="(deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime), text, close up, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck",
            ),
            face_enhance_prompt: str = Input(
                description="Input face prompt",
                default="cjw man",
            ),
            face_enhance_negative_prompt: str = Input(
                description="Input face negative prompt",
                default="",
            ),
            image: str = Input(
                description="Optional image base64 data to use for img2img guidance or controlnet",
                default=None
            ),
            mask: str = Input(
                description="Optional mask base64 data to use for img2img inpainting",
                default=None
            ),
            width: int = Input(
                description="Width of output image.",
                choices=[128, 256, 384, 448, 512, 576, 640, 704, 768, 832, 896, 960, 1024],
                default=512,
            ),
            height: int = Input(
                description="Height of output image.",
                choices=[128, 256, 384, 448, 512, 576, 640, 704, 768, 832, 896, 960, 1024],
                default=512,
            ),
            steps: int = Input(
                description="Number of denoising steps", ge=1, le=500, default=50
            ),
            cfg_scale: float = Input(
                description="Scale for classifier-free guidance", ge=1, le=20, default=5
            ),
            prompt_strength: float = Input(
                description="Prompt strenght when using img2img", ge=0, le=1, default=0.3
            ),
            controlnet_model: str = Input(
                default="control_v11p_sd15_openpose [cab727d4]",
                choices=[
                    "control_v11p_sd15_openpose [cab727d4]",
                    "t2iadapter_openpose_sd14v1 [4286314e]",
                ],
                description="Choose a controlnet model",
            ),
            controlnet_weight: float = Input(
                description="Controlnet weight", ge=0, le=10, default=0.5
            ),
            upscale: int = Input(
                description="Scale for hires fix", ge=1, le=20, default=1
            ),
            restore_face: bool = Input(
                description="Restore face", default=True
            ),
            seed: int = Input(
                description="Random seed. Leave blank to randomize the seed", default=None
            ),
            scheduler: str = Input(
                default="DPM++ SDE Karras",
                choices=[
                    "DDIM",
                    "Euler",
                    "Euler a",
                    "DPM++ SDE Karras",
                    "DPM++ 2M Karras"
                ],
                description="Choose a scheduler.",
            ),
        ) -> Iterator[Path]:
            """Run a single prediction on the model"""

            if not seed:
                seed = random.randint(0, 2 ** 32 - 1)
                
            print("Generating with seed:", seed)

            if action == "txt2img":
                if controlnet:
                    image = Image.open(BytesIO(base64.urlsafe_b64decode(image)))
                    width, height = image.size

                    unit = webuiapi.ControlNetUnit(input_image=image, module='openpose', model=controlnet_model, weight=controlnet_weight)
                
                result = self.api.txt2img(
                                    prompt=prompt,
                                    negative_prompt=negative_prompt,
                                    width=width,
                                    height=height,
                                    seed=seed,
                                    cfg_scale=cfg_scale,
                                    steps=steps,
                                    controlnet_units=[unit] if controlnet else [],
                                    sampler_index=scheduler,
                                    enable_hr=True,
                                    hr_scale=upscale,
                                    hr_upscaler=webuiapi.HiResUpscaler.ESRGAN_4x,
                                    hr_second_pass_steps=20,
                                    hr_resize_x=width * upscale,
                                    hr_resize_y=height * upscale,
                                    denoising_strength=0.4,
                                    alwayson_scripts={
                                        "ADetailer": {
                                            "args": [
                                                restore_face,
                                                {
                                                "ad_model": "face_yolov8n.pt",
                                                "ad_prompt": face_enhance_prompt,
                                                "ad_negative_prompt": face_enhance_negative_prompt,
                                                }
                                            ]
                                        }
                                    }
                                    )
            elif action == "img2img":
                image = Image.open(BytesIO(base64.urlsafe_b64decode(image)))
                width, height = image.size

                if controlnet:
                    unit = webuiapi.ControlNetUnit(input_image=image, module='openpose', model=controlnet_model, weight=controlnet_weight)
                
                if masking:
                    mask = Image.open(BytesIO(base64.urlsafe_b64decode(mask)))

                res = self.api.img2img(
                                    prompt=prompt,
                                    negative_prompt=negative_prompt,
                                    images=[image],
                                    denoising_strength=prompt_strength,
                                    width=width,
                                    height=height,
                                    inpainting_fill=1,
                                    mask_image=mask if masking else None,
                                    controlnet_units=[unit] if controlnet else [],
                                    seed=seed,
                                    cfg_scale=cfg_scale,
                                    steps=steps,
                                    sampler_index=scheduler,
                                    alwayson_scripts={
                                        "ADetailer": {
                                            "args": [
                                                restore_face,
                                                {
                                                "ad_model": "face_yolov8n.pt",
                                                "ad_prompt": face_enhance_prompt,
                                                "ad_negative_prompt": face_enhance_negative_prompt,
                                                }
                                            ]
                                        },
                                    }
                                    )
                
                result = self.api.extra_single_image(image=res.image,
                                 upscaler_1=webuiapi.Upscaler.ESRGAN_4x,
                                 upscaler_2=webuiapi.Upscaler.SwinIR_4x,
                                 gfpgan_visibility=0.2,
                                 upscaling_resize=upscale
                                 )
                
            result.images[0].save("output.png")
            yield Path("output.png")