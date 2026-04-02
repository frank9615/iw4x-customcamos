# IW4x Custom Camo Studio

Benvenuto nello strumento definitivo per la creazione ed estrazione di mimetiche personalizzate per Modern Warfare 2 (IW4x).

![Anteprima Web App](image.png)

## Struttura del Progetto

Di seguito viene illustrata l'organizzazione delle cartelle di questa repository:

- **`iw4x-camo-web/`**: 
  Il cuore del progetto. Contiene l'applicazione Web (HTML/JS/CSS) che effettua tutte le conversioni `.png` -> `.iwi` e l'estrazione inversa `.iwi` -> `.png` direttamente nel tuo browser, sfruttando *WebAssembly* (ImageMagick). 
  
- **`src/`**: 
  Tool Python da terminale che permettono di manipolare o creare file `.iwi` e `.dds` *offline*. Utile se vuoi farti degli script di CI/CD auto-convertenti o se preferisci operare a riga di comando.

- **`test/`**: 
  Contiene l'ambiente di test (principalmente algoritmi in Python per ridimensionare la pixel box a 400x400 e testare la maschera menu in formato Black Ops 2) per poi riversare la geometria vincente dentro il Javascript.

- **`iw_07/` e `other-camos/`**:
  Le cartelle contenenti i file `.iwi` e `.dds` originali di gioco estratti dalle ISO vanilla di Call of Duty, essenziali come metro di paragone bit-a-bit e asset prototipi.

## Come Avviare l'Applicazione Web

L'applicazione web è pensata per essere *client-side zero-knowledge* (senza database né server in back-end necessari), ma poiché esegue dei moduli WebAssembly (il modulo WASM di ImageMagick) è necessario avviarla da un **server HTTP locale** a causa delle policy CORS dei browser moderni.

Hai due opzioni semplici:

### Metodo 1: VSCode (Consigliato)
Se apri questo progetto sfruttando l'editor Visual Studio Code:
1. Installa l'estensione **Live Server**.
2. Fai click col tasto destro sul file `iw4x-camo-web/index.html`.
3. Seleziona **"Open with Live Server"**. Il browser si aprirà magicamente sulla suite.

### Metodo 2: Python HTTP Server (Da Terminale)
Se hai Python già installato e sei all'interno della cartella nativa, vai nella directory dell'app ed esegui i comandi:

```bash
cd iw4x-camo-web
python -m http.server 8000
```
Dopodiché apri il tuo browser preferito e vai all'indirizzo **`http://localhost:8000`**.

Riferisciti al file `CAMO_GUIDE.md` per i dettagli tecnici precisi sui bit di compressione DXT1/DXT5 del formato `IWi\x08`.
