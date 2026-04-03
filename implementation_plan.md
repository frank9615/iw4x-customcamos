# 3D Camo Preview & Model Extraction

This plan addresses your request to add a 3D preview engine in the browser to visualize the generated Camo directly on a weapon, and explains how to extract those 3D models from the game files.

## Estrazione dei modelli 3D dalle cartelle di gioco

Per ottenere i modelli 3D originali delle armi di MW2 / IW4x (come l'Intervention), il metodo standard e più affidabile nella community è l'utilizzo del tool **Greyhound**. 

1. **Scarica Greyhound:** Cerca "Scobalula/Greyhound" su GitHub e scarica l'ultima release. È un fork sviluppato specificamente per esportare i modelli dal motore di gioco della serie Call of Duty.
2. **Setup:** Apri Greyhound e seleziona Modern Warfare 2 (o punta il tool direttamente alla cartella di installazione di IW4x).
3. **Caricamento Asset:** Usa la funzione "Load" all'interno del programma. Questo leggerà i file `.ff` o `.iwd` e ti mostrerà la lista degli asset del gioco.
4. **Esportazione:** Cerca il modello dell'arma (l'Intervention si chiamerà probabilmente qualcosa simile a `weapon_cheytac`). Selezionalo ed esportalo. Verranno estratti anche i file delle texture originali.
5. **Conversione per il Web:** I modelli estratti sono solitamente in formato `.semodel`. Ti servirà **Blender** con l'addon apposito (che trovi sempre su github per Greyhound) per importarli, e poi riesportarli in formato **.glb** o **.gltf**, che è lo standard perfetto per i motori 3D sul Web.

---

## User Review Required

> [!IMPORTANT]
> Per realizzare questa feature PRO, inserirò e configurerò un motore 3D nel browser utilizzando la potente libreria **Three.js**. 
> Tuttavia, per fare in modo che funzioni per l'Intervention, **avrò bisogno che tu, una volta seguito il procedimento sopra, mi fornisca il file esportato in `.gltf` o `.glb`**.
> 
> **NEL FRATTEMPO**, posso già implementare fin da subito l'applicativo 3D: creerò l'interfaccia UI e **caricherò un modello 3D placeholder (es. un fucile generico o un cilindro sagomato)** che farà esattamente ciò che chiedi: applicherà in *Real Time* la tua mimetica personalizzata sull'arma in 3D prima che tu la scarichi. Successivamente, ci basterà sostituire il placeholder con il vero file dell'Intervention.
> 
> Sei d'accordo a procedere subito con l'implementazione in Three.js usando un modello di prova?

## Proposed Changes

### `public/index.html`

- Inclusione della libreria base **Three.js** e l'estensione **GLTFLoader**.
- Aggiunta di una sezione UI dedicata al visualizzatore 3D (un riquadro premium che mostra l'arma).
- Controlli utente: Dropdown per la selezione dinamica del tipo di arma da visualizzare.

### `public/styles.css`

- Stili per il contenitore `div#canvas-container` (bordo in stile "glass", ombre al neon verdi).
- Gestione della responsività e layout diviso: a sinistra le impostazioni della mimetica, a destra o in alto la preview 3D dell'arma.

### `public/app.js` e nuovo `public/viewer3d.js`

#### [NEW] `public/viewer3d.js`
- Script dedicato esclusivamente al rendering 3D. 
- Funzionalità di Camera orbitale, Luci direzionali ambientali perfette per mettere in risalto la specularità (per far sembrare l'arma reale).
- Una funzione `applyCamoTexture(imageUrl)` richiamabile da `app.js` che aggiorna dinamicamente in RAM il materiale della mesh e applica l'immagine selezionata.

## Open Questions

> [!WARNING]
> Quando esporterai l'Intervention tramite Blender, è vitale controllare il **nome esatto del materiale** su cui si applica la camo in game (es. l'ottica sarà un materiale a parte nero neutro, mentre il body avrà il materiale "camo"). Il motore cercherà un materiale specifico su cui "spalmare" la tua texture custom. Ne parleremo più avanti quando avrai il modello.

## Verification Plan

### Test Automatici
- Mi assicurerò che, caricando un file immagine PNG, questo venga passato al nuovo script 3D e renderizzato su un oggetto generato da Three.js.
- Verificherò che non causi freeze sul browser quando si swappano rapidamente diverse texture.

### Test Manuali
- Controllerò che l'interazione del mouse (pan e zoom dell'arma) funzioni in modo fluido sul finto modello. La scena apparirà molto "Mission Accomplished".
