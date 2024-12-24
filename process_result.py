import sys
import json
from PIL import Image
import pytesseract
import cv2
import numpy as np

# テンプレートマッチングで判定を取得する関数
def extract_result_data(image_path, dataset_dir):
    labels = ["PERFECT", "GREAT", "GOOD", "BAD", "MISS"]
    result = {}

    gray_image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    for label in labels:
        template = cv2.imread(f"{dataset_dir}/{label}.png", cv2.IMREAD_GRAYSCALE)
        res = cv2.matchTemplate(gray_image, template, cv2.TM_CCOEFF_NORMED)
        _, _, _, max_loc = cv2.minMaxLoc(res)
        x, y = max_loc
        h, w = template.shape
        num_region = gray_image[y:y + h, x + w:x + w + 50]
        text = pytesseract.image_to_string(num_region, config='--psm 7 digits')
        result[label] = int(text.strip()) if text.strip().isdigit() else 0
    return result

# OCRで楽曲情報を取得する関数
def extract_song_data(image_path):
    image = Image.open(image_path)
    cropped_image = image.crop((0, 0, image.width // 2, image.height))  # 右半分を切り取る
    song_data = pytesseract.image_to_string(cropped_image, lang='jpn')
    
    # 例として単純に楽曲名、難易度、レベルを抽出（実際は正規表現で抽出する）
    return {
        "name": "地球最後の告白を",
        "difficulty": "EXPERT",
        "level": 32
    }

# メイン処理
if __name__ == "__main__":
    image_path = sys.argv[1]
    dataset_dir = sys.argv[2]
    
    song_data = extract_song_data(image_path)
    result_data = extract_result_data(image_path, dataset_dir)
    
    # 結果をJSONで出力
    output = {
        "song": song_data,
        "result": result_data
    }
    print(json.dumps(output))
