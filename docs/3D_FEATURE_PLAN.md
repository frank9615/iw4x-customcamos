# Piano di Implementazione: Motore 3D e Modelli IW4x

Questo documento contiene tutte le informazioni per lo sviluppo dell'anteprima 3D nel browser e la ricerca dei modelli originali di gioco, come richiesto.

## 1. Dove si trova l'Intervention nei file di gioco?

Nei file di gioco di Modern Warfare 2 (IW4x) c'è una netta divisione tra texture (immagini) e modelli 3D (geometria). L'Intervention internamente è chiamato **`cheytac`**.

1. **Modelli 3D (La geometria dell'arma):**
   Sono "compilati" ("cucinati") all'interno di file chiamati **FastFiles (`.ff`)**. Nello specifico, le armi multiplayer si trovano quasi sempre dentro:
   `\zone\english\common_mp.ff` oppure `patch_mp.ff`.
   > **ATTENZIONE:** I file `.ff` non sono archivi normali. NON puoi aprirli con WinRAR o 7-Zip. Serve obbligatoriamente un tool di estrazione (FastFile dumper) perché i modelli 3D sono fusi insieme al codice di mappa.

2. **Texture dell'arma (IWI):**
   Le immagini originali (diffuse, normal, specular map) spesso si trovano sparse negli archivi standard all'interno della cartella `main/` (es. `iw_07.iwd`, `iw_11.iwd`, ecc.). Gli `.iwd` sono in realtà dei semplici file `.zip` rinominati, quindi per le texture puoi semplicemente aprirli con WinRAR.

### Se Greyhound non ti funziona, le alternative sono:
*   **Tom-BMX's Lemon / FFViewer:** Un tool storico per MW2 creato dal leggendario Tom-BMX per navigare dentro i file `.ff` e scaricare gli `xmodel`.
*   **Wraith Archon:** Il tool predecessore di Greyhound. Modding community vecchie usano questo.
*   **Scaricare il modello già estratto:** Molto più semplice. Molti "modder" di Call of Duty Zombies hanno già estratto l'Intervention. Cercando "Cheytac obj download MW2 devraw" oppure "Intervention xmodel port black ops 3" online, trovi archivi `.zip` già formattati per Blender o Maya.

---

## 2. Il Piano: Sviluppo del "3D Preview Engine" nel Browser

Anche senza il modello perfetto in mano ora, posso già costruire l'intero ecosistema 3D nel tuo progetto web.

### A. Le Tecnologie che useremo
*   **Three.js / Model-Viewer:** Sfrutteremo le librerie WebGL per renderizzare fluidamente oggetti 3D.
*   **GLTF / GLB:** Il formato di esportazione che devi poi fornirmi o che useremo per l'arma (è lo standard di settore per il 3D su web, racchiude texture e mesh in un solo file compatto).

### B. Le Modifiche UI (`public/index.html` & `public/styles.css`)
1.  **Canvas 3D:** Creerò un nuovo grande box nell'interfaccia (magari accanto o sopra la sezione "Mission Accomplished") con design vetrato e illuminazione neon ad alta tecnologia.
2.  **Selettore dell'Arma:** Aggiungerò un menu a tendina per far scegliere all'utente quale arma visualizzare nel 3D (inizieremo con un'opzione 'Placeholder' e poi aggiungeremo 'Intervention').
3.  **Animazioni:** Un transizionamento morbido che sfuma dall'immagine 2D della camo al modello 3D non appena la conversione è finita.

### C. La Logica Javascript (`public/app.js` e `public/viewer3d.js`)
1.  **Creazione Scena:** Illuminazione ambientale + luci direzionali (per far brillare il lato metallico dell'arma come accade in game).
2.  **Loading Manager:** Barra di caricamento per assicurarsi che il modello pesante in 3D sia pronto.
3.  **Texture Swapping in tempo reale (LA MAGIA):** Creerò una funzione che prenderà il file PNG che immetti sulla piattaforma e lo andrà a sostituire dinamicamente sul materiale del modello 3D corretto, senza refresh della pagina!

## Prossimi Passaggi

1. Io procedo *adesso* a scrivere i codici in `index.html`, `styles.css` e a creare il motore `viewer3d.js`.
2. Utilizzerò un file 3D "fittizio" (es. una scatola a forma di fucile) per testare il caricamento delle texture.
3. Nel frattempo tu puoi provare a cercare un `.obj` o `.gltf` dell'Intervention già estratto online, oppure riprovare con le alternative a Greyhound. Quando ce lo avrai, lo butteremo in una cartella `/models/` nel progetto e l'effetto finale sarà spettacolare.
