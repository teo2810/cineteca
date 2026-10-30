# Cineteca

Archivio personale di film e serie, nel browser. Non è l’app «BingeT» e non ne copia grafica, icone o testi: ripete solo il tipo di funzioni (liste, stati, episodi, voti, note, numeri, obiettivi) e aggiunge una copia su Google Sheet che non dipende dalla cache del telefono.

Non c’è social, pubblicità o analytics. Non serve un abbonamento a pagamento.

## Cosa fa

- Liste separate per film e serie, più liste con un nome tuo (per esempio «K-drama»).
- Sei stati: visto, da vedere, in corso, completato, in pausa, abbandonato.
- Episodi segnati stagione per stagione. L’elenco puntate arriva da TMDB solo quando apri quella stagione.
- Voto da 0 a 10, anche i mezzi punti.
- Note senza un limite imposto dall’app (c’è un limite della cella di Google, vedi sotto).
- Scheda con copertina, cast, durata, data, paesi.
- Numeri: mappa dell’attività, generi, decenni, paesi, piattaforme (se TMDB le manda).
- Dieci obiettivi, bronzo / argento / oro. Si possono aggiungere altri nell’elenco `GOALS` dentro `index.html`.
- «Prossime uscite»: un elenco, non una notifica.
- Ricerca in archivio per titolo, regista, attore, genere, tag. Ordine per data, titolo, voto, anno.
- Nella scheda, «Correlati»: stessa saga, stesso regista, attori in comune, con il motivo scritto sotto.
- Export e import JSON. L’unione tiene la scheda modificata più di recente.
- Interfaccia in italiano. I testi stanno nell’oggetto `I18N` in `index.html`: un’altra lingua si aggiunge lì, non è ancora tradotta.
- Tema chiaro o scuro, automatico come il telefono, oppure fisso dalle Impostazioni.

## Cosa non fa (e non va promesso)

- Le notifiche push di una pagina web non sono affidabili, soprattutto su iPhone. Cineteca non le usa. C’è solo la sezione Uscite.
- Non entra nell’account di BingeT e non garantisce di leggere il suo file di backup: quel formato non è pubblicato. Vedi «Da verificare».
- Le copertine non vengono salvate nel foglio: si salva solo il percorso (`poster_path`). Senza rete la copertina può mancare; titolo, voto e note restano.
- La chiave TMDB, l’indirizzo dello script e il token non stanno in questo repository. Restano nel browser, in `localStorage`.

## Come sono salvati i dati

1. Ogni modifica si scrive subito in IndexedDB (archivio del browser, non solo `localStorage`).
2. All’avvio l’app chiede `navigator.storage.persist()`, così il browser è meno incline a cancellare i dati. Nelle Impostazioni leggi se ha detto sì o no.
3. Circa 1,5 secondi dopo l’ultima modifica, se hai configurato il foglio, parte il sync.
4. Il sync legge il foglio, unisce per `id` (vince il campo `updated` più recente) e rimanda l’insieme unito.
5. La richiesta di scrittura è un POST con corpo JSON e `Content-Type: text/plain`, per non far scattare il preflight CORS.
6. Un titolo tolto dall’archivio non viene cancellato davvero: resta con `del: true` (cestino). Si può ripristinare dalle Impostazioni.
7. Se sei offline, i dati restano sul dispositivo e il sync riparte quando torna la rete.
8. Il foglio è la fonte di verità tra un telefono e un altro. Svuotare la cache del browser non cancella il foglio. Può cancellare la copia locale se il browser non ha concesso la persistenza e non hai ancora sincronizzato.

Nel foglio finiscono l’id TMDB, lo stato, il voto, le note, i tag, le liste, gli episodi visti, e come cache titolo, anno e `poster_path` (più i campi utili alla scheda offline: generi, cast, ecc.). Le immagini no. Gli array stanno dentro la cella `json`.

## 1. Creare il foglio Google

I nomi dei menu di Google cambiano ogni tanto. Se una voce non è identica, cerca quella più simile.

1. Apri [Google Fogli](https://sheets.google.com) con l’account che deve possedere l’archivio.
2. Crea un foglio vuoto e chiamalo `Cineteca`.
3. Menu **Estensioni → Apps Script**. Si apre un progetto già legato a questo foglio. Non creare uno script «vuoto» dal sito di Apps Script, altrimenti non vede il foglio.
4. Cancella il codice di esempio (`function myFunction`).
5. Apri il file `Code.gs` di questo repository, copialo tutto e incollalo nell’editor.
6. In cima al file c’è `var TOKEN = "CAMBIA-QUESTO-TOKEN";`. Sostituisci `CAMBIA-QUESTO-TOKEN` con una frase lunga tua, inventata, che non usi come password da altre parti. Esempio di forma: una sequenza di quattro parole a caso. Non pubblicarla e non rimetterla su GitHub.
7. Salva (icona del dischetto, oppure Ctrl+S).
8. In alto a destra: **Distribuisci → Nuova distribuzione**.
9. Tipo: **App web**.
10. Descrizione: `Cineteca`.
11. **Esegui come**: `Io` (il tuo account).
12. **Chi ha accesso**: `Chiunque`.
    Serve «Chiunque», non «Chiunque con un account Google»: altrimenti il browser dell’app non riesce a chiamarlo.
13. Clicca **Distribuisci**. Google chiede di autorizzare l’accesso al foglio. Se compare «Google non ha verificato questa app»: **Avanzate → Vai a Cineteca (non sicuro)**. È il tuo script, non un’app dello store.
14. Copia l’URL della distribuzione. Deve finire con `/exec`. Tienilo insieme al token: chi li ha entrambi può leggere e scrivere il tuo archivio. Non è un login con password di Google. È un lucchetto semplice.
15. Controllo: incolla l’URL in una scheda nuova e in fondo aggiungi `?token=` più la tua frase. Esempio di forma: `https://script.google.com/macros/s/……/exec?token=LA_TUA_FRASE`. Devi vedere un testo che inizia con `{"ok":true`. Se dice che il token non è valido, la frase nell’URL e quella in `Code.gs` non coincidono. Se Google chiede di accedere, la distribuzione non è su «Chiunque» oppure non hai finito l’autorizzazione.

Se in seguito cambi `Code.gs`, non basta salvare: **Distribuisci → Gestisci distribuzioni → modifica (matita) → Versione: Nuova versione → Distribuisci**. L’URL resta lo stesso.

## 2. Copia settimanale su Drive

1. Sempre nell’editor Apps Script, apri l’icona dell’orologio (**Attivatori**).
2. **Aggiungi attivatore**.
3. Funzione da eseguire: `backup`.
4. Origine evento: **Basato sul tempo**.
5. Tipo: **Timer settimanale**. Giorno e ora: quelli che preferisci.
6. Salva. Se chiede permessi di Drive, accettali.
7. `backup` copia l’intero foglio in una cartella di Drive chiamata `Cineteca backup`. Non sostituisce l’export JSON: sono due reti di sicurezza.

## 3. Chiave TMDB (gratis)

I dati di film e serie arrivano da [The Movie Database](https://www.themoviedb.org/). Questo prodotto usa l’API TMDB ma non è approvato né certificato da TMDB.

1. Crea un account su [themoviedb.org](https://www.themoviedb.org/signup) e conferma l’email.
2. Apri le impostazioni API: [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api). Se il link non è più quello, dal tuo avatar: Impostazioni, poi API.
3. Chiedi una chiave. Tipo: Developer. Uso: personale, non commerciale.
4. Copia la **API Key (v3 auth)**. È una stringa corta, di solito 32 caratteri. Non copiare il «API Read Access Token» (quello lungo, v4): questa bozza usa la chiave v3.
5. La chiave **non** va messa nel repository. Si incolla solo nelle Impostazioni dell’app, sul tuo telefono o computer.

In un sito che gira nel browser la chiave è visibile a chi apre gli strumenti di sviluppo, perché le richieste partono dal tuo dispositivo. Non è un errore di questa bozza: senza un server tuo non si può nascondere. Non condividere lo schermo sbloccato sulle Impostazioni. Se la chiave finisce in giro, dalla stessa pagina API di TMDB revoca o ricrea la chiave (il nome preciso del pulsante è **da verificare**: il sito lo cambia) e incolla quella nuova nelle Impostazioni.

Leggi anche i termini TMDB. La chiave gratuita è per uso non commerciale. Se un giorno l’app diventasse a pagamento, servirebbe un accordo con TMDB: **da verificare** sul loro sito prima di farlo.

## 4. Mettere il sito online (GitHub Pages)

Il repository è pubblico, sul branch `main`. Manca un clic che da qui non si può fare: l’accesso GitHub collegato può creare il repo, non può accendere Pages.

1. Apri [github.com/teo2810/cineteca](https://github.com/teo2810/cineteca).
2. **Settings** (Impostazioni del repository, non quelle del profilo).
3. Nel menu a sinistra: **Pages**.
4. Sotto «Build and deployment», scegli **Deploy from a branch**.
5. Branch: **main**. Cartella: **/ (root)**. Salva.
6. In cima alla stessa pagina, dopo uno o due minuti, compare l’indirizzo. Sarà `https://teo2810.github.io/cineteca/`. Se all’inizio vedi un errore 404, aspetta e ricarica: la prima pubblicazione non è immediata.

Sul telefono, dal browser: menu **Aggiungi a schermata Home**. Su iPhone, in Safari: pulsante di condivisione, poi «Aggiungi a Home». I nomi di quei pulsanti sono **da verificare** se Apple li ha rinominati.

## 5. Collegare l’app

1. Apri Cineteca.
2. Vai su **Impostazioni**.
3. Incolla la chiave TMDB.
4. Incolla l’URL che finisce con `/exec`.
5. Incolla lo stesso token di `Code.gs`.
6. Regione piattaforme: `IT` (due lettere). È il paese usato per chiedere a TMDB dove si può vedere un titolo.
7. **Salva su questo browser**.
8. **Prova il collegamento al foglio**. Deve dire quante schede ci sono (all’inizio zero).
9. **Sincronizza ora**. In cima, dopo un sync riuscito, compare «Sync ok». Nelle Impostazioni vedi «Ultimo sync riuscito» con data e ora. Prima di allora resta «mai».

Da quel momento puoi cercare un titolo, aprirlo e aggiungerlo. La ricerca usa `search/multi` e tiene solo film e serie, lingua `it-IT`. La scheda chiede i dettagli con `append_to_response=credits,watch/providers`.

## Backup JSON

In Impostazioni: **Esporta JSON** scarica un file `cineteca-backup.json`. **Importa JSON** lo unisce a ciò che c’è già: se lo stesso `id` esiste da entrambe le parti, resta la scheda con `updated` più grande. Le schede segnate come eliminate restano nel file, così il cestino non si «rimette in vita» per sbaglio.

Il formato è questo (versione 1):

```json
{
  "format": "cineteca-backup",
  "version": 1,
  "exportedAt": "2026-10-30T12:00:00.000Z",
  "items": []
}
```

## Piattaforme streaming

Quando aggiungi un titolo, o quando premi «Aggiorna scheda da TMDB» / «Aggiorna piattaforme», l’app legge `watch/providers` e tiene i nomi in abbonamento (`flatrate`) e gratuiti (`free`) per la regione scelta. TMDB dice che quei dati arrivano dalla partnership con JustWatch: non sono un elenco garantito e cambiano. Noleggio e acquisto non vengono contati come «piattaforma» in questa bozza.

**Da verificare:** se i termini JustWatch, oltre al credito già scritto in app («Fonte TMDB / JustWatch»), chiedono anche un logo.

## Obiettivi inclusi

Scaffale, Sguardo critico, Diario, Maratoneta, Mappa dei generi, Liste tue, Fino in fondo, Decenni, Passaporti, Prima nota. Soglie bronzo / argento / oro scritte in `GOALS`. Per aggiungerne uno: una riga nuova in quell’elenco e due testi in `I18N.it` (`goal_id` e `goal_id_d`).

## Da verificare

Non ho potuto controllare queste cose contro i servizi veri (non ho la tua chiave né il tuo foglio):

- Che il POST verso Apps Script, dal telefono, superi il redirect di Google e scriva davvero le righe. Il GET (`?token=`) lo controlli tu al punto 15 della sezione 1. Se il GET funziona e il foglio resta vuoto dopo «Sincronizza ora», è quel limite: va detto, non è il caso di insistere a vuoto.
- Che una cella di Sheet regga la tua nota più lunga. Il limite documentato da Google è circa 50.000 caratteri per cella. L’app non taglia il testo; una nota enorme può far fallire il salvataggio di quel solo titolo.
- Il formato JSON esportato da BingeT. Non è pubblicato. L’import di Cineteca accetta il proprio backup, un oggetto con `items`, oppure un array di schede che abbiano già `id` (o `tmdb_id` insieme a `type` movie/tv). Se un file di BingeT non è così, l’app non tocca l’archivio e avvisa.
- I nomi esatti dei menu Google, TMDB e iPhone, se li hanno cambiati dopo questa pagina.
- Se la chiave gratuita riceve sempre `watch/providers` per l’Italia. Se la scheda dice che non c’è nessuna piattaforma, può essere TMDB senza dati per quel titolo, non un guasto.
- Il campo `job` del regista: TMDB lo manda in inglese (`Director`) anche con `language=it-IT`. I correlati «stesso regista» usano quello, più `Creator` e il dipartimento `Directing`.
- Obblighi di attribuzione JustWatch oltre la riga già in app.
- Se un uso diverso da quello personale rientra ancora nel piano gratuito TMDB.

## Stato di questa bozza

**Controllato nel browser, in locale, senza chiave TMDB e senza foglio Google:**

- la pagina si apre, in italiano, su schermo largo e su schermo stretto, senza errori in console;
- tema chiaro e tema scuro;
- import JSON e unione (messaggio «Unite N schede»);
- libreria film/serie, filtro per attore, regista e tag, lista personale, cestino previsto in interfaccia;
- scheda con voto 8,5, nota, tag, stato;
- episodi: senza rete verso TMDB l’app usa comunque i numeri 1..N della stagione e il segno «visto» aggiorna il conteggio;
- numeri (generi, decenni, paesi, Netflix se era già in scheda, mappa attività) e i dieci obiettivi;
- sezione Uscite con l’avviso che non ci sono notifiche, e una puntata già messa in cache nel file di prova;
- Impostazioni: frase di attribuzione TMDB, link a themoviedb.org, «ultimo sync» che resta «mai» finché il foglio non risponde, stato della memoria persistente;
- ricerca senza chiave: messaggio in italiano, non una pagina bianca;
- prove automatiche interne su unione dei record, voto a mezzi punti, e cambio stato serie (in corso / completato / abbandonato che non viene sovrascritto).

**Non controllato:**

- una chiave TMDB vera (ricerca, copertine, cast dal vivo, stagione con i titoli degli episodi, correlati, prossime uscite dal vivo);
- un Google Sheet vero (GET, POST, token sbagliato, trigger `backup`);
- l’installazione sulla schermata Home di un iPhone;
- se il browser, sul tuo telefono, concede davvero `persist()`.

Il service worker, sul sito pubblicato, tiene in cache solo il guscio (pagina, manifest, icone). Non mette in cache l’archivio né TMDB. Nell’anteprima di sviluppo resta spento, di proposito, così non si vede una pagina vecchia.
