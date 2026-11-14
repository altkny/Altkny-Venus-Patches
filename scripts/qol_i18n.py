#!/usr/bin/env python3
"""Temporary localization of experimental QoL labels for all configured languages.

For languages without human-reviewed text, use the English source as an explicit
fallback until translators review it. Never delete or replace existing entries.
"""
import json
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
base=ROOT/"patches/src/main/resources/venus/i18n"
found=json.loads(subprocess.check_output(["node", str(ROOT/"scripts/i18n_strings.cjs")],cwd=ROOT,text=True))
pt={
    "Reverse image search":"Pesquisa reversa de imagem",
    "Copy file contents":"Copiar conteúdo do arquivo",
    "Reply timestamp":"Data da resposta",
    "Image descriptions":"Descrições das imagens",
    "Channel preview":"Prévia do canal",
    "Preview cached messages":"Prévia de mensagens em cache",
    "No cached messages. Open this channel first to load them.":"Nenhuma mensagem em cache. Abra o canal primeiro para carregá-las.",
    "Channel preview unavailable":"Prévia do canal indisponível",
    "Image descriptions":"Descrições das imagens",
    "File text copied":"Texto do arquivo copiado",
    "Couldn't copy this file":"Não foi possível copiar o arquivo",
    "Search an image attachment on TinEye. The image URL is shared with TinEye.":"Pesquise uma imagem anexada no TinEye. O endereço da imagem será compartilhado com o serviço.",
    "Copy text from a small attached text file.":"Copie o texto de um arquivo pequeno anexado.",
    "Show the original message date on quoted replies.":"Mostre a data da mensagem original nas respostas.",
    "Read descriptions provided for attached images.":"Leia as descrições fornecidas para as imagens anexadas.",
    "Preview only messages already cached on this device.":"Veja apenas mensagens já armazenadas em cache neste dispositivo."
}
codes=[c.strip() for c in (base/"index.txt").read_text().splitlines() if c.strip()]
for code in codes:
    path=base/(code+".json")
    data=json.loads(path.read_text(encoding="utf-8"))
    strings=data["strings"]
    missing=[key for key in found if key not in strings]
    for key in missing:
        strings[key]=pt.get(key,key) if code=="pt-BR" else key
    if missing:
        data["strings"]=dict(sorted(strings.items(),key=lambda pair:pair[0]))
        path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(code,len(missing),"temporary English fallbacks" if code!="pt-BR" else "PT-BR labels")
