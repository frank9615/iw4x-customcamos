# Estrazione Modelli 3D da IW4x / MW2

> Guida al workflow completo: dalla cartella di gioco al file `.glb` per il web  
> Caso d'uso: **Intervention (CheyTac M200)**

---

## Workflow riassuntivo

```
Call of Duty MW2 (in esecuzione con l'arma in classe)
          ↓
   Greyhound  →  export  weapon_cheytac_mp  →  .cast
          ↓
   Blender + Cast Plugin  →  import .cast
          ↓
   Export glTF 2.0  →  weapon_cheytac.glb
          ↓
   gltf.report  →  verifica e preview online
```

---

## 1. Estrazione con Greyhound

### Prerequisiti

- [Greyhound](https://github.com/Scobalula/Greyhound) — ultima release
- Call of Duty: Modern Warfare 2 installato (copia originale)
- Microsoft Visual Studio 2017 Runtime (x86 e x64)

### Procedura

Greyhound non legge i file `.ff` a freddo per tutti gli asset. Per esportare un'arma specifica è necessario che il gioco la carichi in memoria. La procedura corretta è:

1. Avvia **Call of Duty: Modern Warfare 2** (o IW4x).
2. Crea una classe personalizzata con l'**Intervention** come arma principale.
3. Avvia una partita (anche offline/privata) per caricare l'arma in memoria.
4. Senza chiudere il gioco, apri **Greyhound**.
5. Clicca su **Load Game** — il tool leggerà la memoria del processo di gioco attivo.
6. Nella lista degli asset apparirà la geometria dell'arma caricata.

### Asset esportato

Il nome interno dell'asset nel motore IW (Infinity Ward Engine) è:

```
weapon_cheytac
```

Nella lista di Greyhound sono disponibili più varianti:

| Variante | Note |
|---|---|
| **LOD 1 / Bones 24** ✅ | Alta qualità, view model (prima persona), rig completo — **scelto** |
| LOD 1 / Bones 11 | Alta qualità, world model (arma a terra / in mano al nemico) |
| LOD 3 | Versione semplificata per distanza, sconsigliata |

### Formato di export: .cast

Il formato scelto è `.cast`, il formato moderno sviluppato da [DTZxPorter](https://github.com/dtzxporter/cast) che sostituisce il precedente `.semodel`.

Per cambiare il formato in Greyhound: `Settings → Export Model Format → Cast`

---

## 2. Importazione in Blender

### Prerequisiti

- [Blender](https://www.blender.org/) versione 3.6 o superiore (consigliato 4.x)
- Plugin Cast per Blender: scaricare `blender_cast_plugin.zip` dalla [pagina releases](https://github.com/dtzxporter/cast/releases)

> ⚠️ Su Blender 5.0 il plugin ha un bug noto con le animazioni. Usare Blender 4.x.

### Installazione del plugin

1. `Edit → Preferences → Add-ons → Install`
2. Selezionare il file `blender_cast_plugin.zip`
3. Cercare **Cast** nella barra di ricerca
4. Abilitare il plugin con la spunta
5. Cliccare **Save User Settings**

### Importazione del modello

`File → Import → Cast (.cast)` → selezionare `weapon_cheytac_mp.cast`

Il modello importerà automaticamente mesh, UV, scheletro e materiali (se le texture sono nella stessa cartella dell'export di Greyhound).

---

## 3. Export in .glb per il web

`File → Export → glTF 2.0 (.glb/.gltf)`

Impostazioni consigliate:

- **Format:** GLB *(file singolo, texture incluse)*
- **Mesh:** UVs, Normals, Vertex Colors spuntati
- **Armature:** Include (se si vuole mantenere lo scheletro)
- **Materials:** Export → PBR Metallic Roughness

---

## 4. Verifica online con gltf.report

Caricare il file `.glb` su **[gltf.report](https://gltf.report)** per:

- Visualizzare un'anteprima 3D del modello
- Controllare statistiche (triangoli, texture, dimensione file)
- Verificare che materiali e UV siano stati esportati correttamente
- Ottimizzare e ri-scaricare il file se necessario

---

## Riferimenti

| Tool | Link |
|---|---|
| Greyhound | https://github.com/Scobalula/Greyhound |
| Cast (formato + plugin) | https://github.com/dtzxporter/cast |
| Blender | https://www.blender.org |
| gltf.report | https://gltf.report |
