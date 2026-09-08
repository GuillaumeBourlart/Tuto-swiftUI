#!/usr/bin/env python3
"""Typecheck the self-contained teaching examples with the installed iOS SDK."""
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
LESSONS = [
    'fiche_01_08_identite_cycle_de_vie.md',
    'fiche_02_12_choisir_etat_et_bindings.md',
    'fiche_02_11_observable_viewmodel_moderne.md',
    'fiche_05_04_navigation_pilotee_par_etat.md',
    'fiche_05_05_onglets_deep_links_et_split_view.md',
    'fiche_05_06_atelier_navigation.md',
]
sdk = subprocess.check_output(['xcrun', '--sdk', 'iphonesimulator', '--show-sdk-path'], text=True).strip()
lab = (ROOT / 'exemples/NavigationLab/ContentView.swift').read_text()
assert (ROOT / 'site/public/exemples/NavigationLab/ContentView.swift').read_text() == lab
assert '```swift\n' + lab + '```' in (ROOT / 'fiche_05_06_atelier_navigation.md').read_text()
with tempfile.TemporaryDirectory(prefix='swiftui-cours-') as temp:
    for i, filename in enumerate(LESSONS):
        blocks = re.findall(r'^```swift\n(.*?)^```', (ROOT / filename).read_text(), re.M | re.S)
        source = Path(temp) / f'Lesson{i}.swift'
        source.write_text('\n\n'.join(blocks))
        command = ['xcrun', 'swiftc', '-typecheck', '-swift-version', '6',
                   '-sdk', sdk, '-target', 'arm64-apple-ios17.0-simulator',
                   '-module-cache-path', str(Path(temp) / 'cache'), str(source)]
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode:
            print(filename, result.stderr, flush=True)
            raise SystemExit(result.returncode)
        print(f'OK — {filename} ({len(blocks)} blocs Swift)', flush=True)
print('Les six ensembles compilent en vérification de types. Les interactions restent à essayer sur simulateur.')
