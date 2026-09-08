#!/bin/zsh
set -e
course_dir="${0:A:h}"
course_url="http://127.0.0.1:3000/"
if [[ ! -f "$course_dir/site/out/index.html" ]]; then
  print 'Le lecteur doit être construit : consulte site/README.md.'
  read '?Appuie sur Entrée pour fermer.'
  exit 1
fi
if ! command -v python3 >/dev/null; then
  print 'Python 3 est nécessaire pour ouvrir le lecteur local.'
  read '?Appuie sur Entrée pour fermer.'
  exit 1
fi
# Reuse this reader if it is already running at the same address.
if python3 - "$course_url" <<'PYTHON'
import sys
from urllib.request import urlopen
try:
    with urlopen(sys.argv[1], timeout=1) as response:
        page = response.read().decode('utf-8')
    sys.exit(0 if '<title>Cours SwiftUI</title>' in page else 1)
except Exception:
    sys.exit(1)
PYTHON
then
  open "$course_url"
  exit 0
fi
print 'Cours SwiftUI : http://127.0.0.1:3000/' 
print 'Garde cette fenêtre ouverte. Ctrl+C arrête le lecteur.'
# The browser may reuse an already-running instance at the same origin.
(sleep 1; open "$course_url") &
python3 -m http.server 3000 --bind 127.0.0.1 --directory "$course_dir/site/out"
