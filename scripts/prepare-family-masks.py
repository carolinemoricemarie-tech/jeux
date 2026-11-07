"""Prepare private person masks locally; no photos leave the creation machine.

Development-only dependencies: torch 2.6.0 CPU, torchvision 0.21.0, Pillow, numpy.
Weights: official torchvision DeepLabV3 MobileNetV3 fc3c493d (VOC person class).
These dependencies and weights are not needed or included in the playable game.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
import torch
from PIL import Image, ImageFilter
from torchvision.models.segmentation import deeplabv3_mobilenet_v3_large

parser = argparse.ArgumentParser()
parser.add_argument('--weights', required=True)
parser.add_argument('--manifest', default='assets/private/manifest.json')
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
weights = Path(args.weights)
if not hashlib.sha256(weights.read_bytes()).hexdigest().startswith('fc3c493d'):
    raise ValueError('Expected the official fc3c493d torchvision weights.')
torch.set_num_threads(2)
model = deeplabv3_mobilenet_v3_large(weights=None, weights_backbone=None, aux_loss=True)
model.load_state_dict(torch.load(weights, map_location='cpu', weights_only=True))
model.eval()
manifest_path = root / args.manifest
manifest = json.loads(manifest_path.read_text())
mean = torch.tensor([.485, .456, .406])[:, None, None]
std = torch.tensor([.229, .224, .225])[:, None, None]
for character, group in manifest['characters'].items():
    for key, filename in list(group.items()):
        if not (key.startswith('care') or key.startswith('equip')) or key.endswith('Mask'):
            continue
        image = Image.open(root / filename).convert('RGBA')
        columns = 4 if key == 'careIdle' else 2
        cw, ch = image.width // columns, image.height // 2
        sheet = Image.new('L', image.size)
        for i in range(columns * 2):
            cell = image.crop((i % columns*cw, i // columns*ch, (i % columns+1)*cw, (i // columns+1)*ch))
            background = Image.new('RGB', cell.size, '#edf1ee')
            background.paste(cell, mask=cell.getchannel('A'))
            pixels = np.asarray(background.resize((512, 512), Image.Resampling.BILINEAR), dtype=np.float32) / 255
            tensor = (torch.from_numpy(pixels).permute(2, 0, 1) - mean) / std
            with torch.inference_mode():
                person = model(tensor[None])['out'][0].softmax(0)[15].numpy()
            mask = Image.fromarray(np.uint8(np.clip((person-.12)/.5, 0, 1)*255))
            mask = mask.resize(cell.size, Image.Resampling.BILINEAR).filter(ImageFilter.MaxFilter(3))
            sheet.paste(mask, (i % columns*cw, i // columns*ch))
        # Half resolution is enough for a soft protection edge and saves memory.
        dest = root / 'assets/private' / f'{character}-{key}-person-mask.webp'
        sheet.resize((image.width//2, image.height//2), Image.Resampling.BILINEAR).save(dest, lossless=True)
        group[key+'Mask'] = './' + str(dest.relative_to(root))
        print(character, key, 'mask ready', flush=True)
manifest_path.write_text(json.dumps(manifest, indent=2))
