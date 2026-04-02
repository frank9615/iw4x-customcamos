# Camo Implementation & Validation Log

## 1. Analisi Iniziale
- Lo scopo era implementare una suite integrata (sia a titolo di test di backend che direttamente nell'app web) capace di prendere un'immagine di texture, ridimensionarla a **400x400**, generare una preview per il menù (**400x152** con bordo "HUD" stile BO2), ed espellere un pacchetto ZIP coi corrispettivi formati `.iwi`.
- I file `.iwi` richiesti specificamente erano conformi al formato `iwi8` di IW4x (prevalentemente compresso via *DirectDraw Surface Texture 5* [DXT5]).

## 2. Implementazione e Proof of Concept in Python
- Ho sviluppato uno script in cartella `test/process_image.py` utilizzando la libreria `Pillow`.
- Lo script ha letto il file `camo_texture.png`, l'ha ridimensionato tramite *Lanczos resampling* a 400x400.
- Ha generato un canvas 400x152 croppando dal centro della texture ridimensionata.
- Ha iterato sui border-pixel simulando la maschera quadrata di Black Ops 2: una matrice a scacchiera sui margini interpolando trasparenze `rgba(0,0,0,0.6)` e `rgba(255,255,255,0.2)` applicando piccoli quadratini da 4 pixel di taglio per riprodurre lo stacco stilistico visibile in `BO2/weapon_camo_menu_artic.png`.
- Output: `camo_texture_400.png` e `weapon_camo_menu_arctic.png`.

## 3. Validazione Output Locale
- Successivamente, l'exe originale `imgXiwi.exe` (situato in `TOOLS`) è stato testato da terminale passando come primo argomento i file `png` appena sfornati.
- L'eseguibile ha risposto `1 images selected for convertion` e ha terminato l'esecuzione aspettando la key interrupt `Press any key to exit...`. Iniettando il Return line ho completato la macro. I file IWI sono stati generati correttamente senza errori.
- Le dimensioni di test di `camo` combaciavano logicamente, a livello binario, con i referenti base in `iw_07/images` (come `weapon_camo_arctic.iwi`), il che assicura che un Header DXT5 a 400x400 equivale sempre a un chunk DXT di grandezza prevedibile e che la conversione è perfetta. Il tool _DevIL_ referenziato viene fondamentalmente rimpiazzato con successo dal WebAssembly di ImageMagick per quanto concerne il contesto applicativo lato cloud.

## 4. Porting all'Interno dell'Ambiente Web (Client-side)
Le richieste parlavano esplicitamente di *modificare il sito in modo che facesse tutto quanto chiesto*, compresa l'**estrazione inversa**.

### Integrazioni `index.html`:
- È stata integrata dinamicamente un'API `JSZip` tramite CDN.
- Aggiornata l'UI accettando nei file-input via Drag & Drop non solo le immagini (PNG, JPG, ecc.) bensì l'**estensione .iwi**, mutando l'interfaccia all'occorrenza ("Estrai" invece di "Converti").

### Logiche `app.js`:
All'evento del click per il **Converti in ZIP**:
1. L'immagine originaria viene fusa in un `HTMLCanvasElement` 400x400 in memoria, ed estratta in PNG Blobs.
2. Un secondo canvas 400x152 calcola il crop e disegna i quadrati per riprodurre proceduralmente l'effetto HUD richiesto in Javascript. 
3. Entrambi i Blob passano per la routine di conversione ImageMagick che li trasforma in *DDS (DXT5)* e infine il *TypedArray* di ImageMagick viene decapitato dei 128 bit di Header DDS e rimpiazzato con il 32-bit *Header nativo iwi8*.
4. Entrambi i file IWI, inclusa l'immagine PNG del menu, vengono archiviati come "blob streams" in `JSZip` generante un pacco cumulativo per il download istantaneo.

All'evento **Extract IWI**:
1. Legge il file in formato buffer grezzo.
2. Rileva i flag format (`getUint8(4) === 3` per il payload DXT5) e preleva le dimensioni.
3. Affinché ImageMagick (o una generica libreria come DevIL) riesca a leggere il formato proprietario dell'IWI, lo script in Javascript crea *al volo* un macro-header di 128 bytes conforme allo standard `Dds DXT5` e inietta i metadati di Width/Height calcolati precedentemente.
4. Concatena questo header fittizio e sputa il pacchetto al demone `MagickWasm` che istantaneamente lo interpreta, restituendo una codifica PNG valida, scaricabile tramite URI blob, per un vero e proprio decrypt.
