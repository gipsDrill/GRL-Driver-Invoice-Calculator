# Wprowadzanie dat i godzin głosem — PL / EN

Przy polach daty, Start i End znajduje się mikrofon. Naciśnij go, aby wprowadzić jedną godzinę lub datę w wybranym języku. Na iPhonie lub iPadzie panel domyślnie korzysta z dyktowania klawiaturą systemową — zarówno w Safari lub Edge, jak i po otwarciu z ikony na ekranie głównym. Na innych urządzeniach rozpoznawanie przeglądarki uruchamia się po zgodzie na mikrofon.

W panelu mikrofonu wybierz **PL · Polski** lub **EN · English (UK)**. Wybór jest zapamiętywany na urządzeniu. Zmiana języka przerywa aktualne rozpoznawanie przeglądarki i usuwa oczekujący wynik. Rozpocznij nową wypowiedź w wybranym języku. Jednocześnie obsługiwane jest tylko jedno wybrane pole.

Krótka, rozwijana ściąga **Jak mówić? / What can I say?** w panelu zawiera przykłady, wskazówkę o porze dnia oraz informację o sprawdzeniu i cofnięciu wyniku. Główny formularz, jego oryginalny styl i kod obliczeń, zapisu oraz eksportu pozostają zachowane; dodane style dotyczą tylko kontrolek głosowych i ich miejsc przy polach.

| Wypowiedź | Wynik |
| --- | --- |
| „godzina szósta trzydzieści rano” | 06:30 |
| „koniec godzina osiemnasta” w polu End | 18:00 |
| „wpół do siódmej rano” | 06:30 |
| „za kwadrans siódma rano” | 06:45 |
| „szósta wieczorem” | 18:00 |
| „północ” | 00:00 |
| „szósta trzydzieści” | Wybór 06:30 lub 18:30 |
| „szesnasty listopada dwa tysiące dwadzieścia sześć” | 16.11.2026 |
| „wczoraj” | Wczorajsza data według lokalnej daty telefonu |
| „szesnasty listopada” | Potwierdzenie daty z proponowanym rokiem |

| Wypowiedź po angielsku (EN) | Wynik |
| --- | --- |
| “six thirty AM” | 06:30 |
| “half past six in the morning” | 06:30 |
| “six PM” | 18:00 |
| “eighteen thirty” | 18:30 |
| “quarter to seven in the morning” | 06:45 |
| “half six” | Wybór 06:30 lub 18:30 |
| “yesterday” | Wczorajsza data według lokalnej daty telefonu |
| “the sixteenth of November twenty twenty-six” | 16.11.2026 |
| “04/05/2026” | 4 maja 2026 — kolejność brytyjska dzień/miesiąc/rok |
| “16 November” | Potwierdzenie daty z proponowanym rokiem |

Rozpoznany, jednoznaczny wynik trafia do pola. Panel pokazuje wypowiedź oraz wpisaną wartość i umożliwia cofnięcie ostatniego wpisu. Przy niejednoznacznej godzinie trzeba wybrać właściwy wariant. Brak roku wymaga potwierdzenia — proponowany jest rok istniejącej wartości pola, a w pustym polu bieżący rok telefonu. Niepoprawna data, nierozpoznane słowa i kilka poleceń naraz nie zmieniają formularza.

Pola **Week ending (Sunday)** wymagają potwierdzenia i przyjmują wyłącznie niedzielę. Zmieniają wszystkie siedem dat danego tygodnia. Cofnięcie odtwarza poprzednie indywidualne daty, także puste lub nieregularne. Jeśli użytkownik później zmienił te dane, cofnięcie nie nadpisuje jego zmian.

Po wpisaniu danych naciśnij **Calculate All**, jak przy ręcznym wprowadzaniu. **Save** zapisuje formularz na urządzeniu; samo dyktowanie nie włącza automatycznego zapisywania ani nie tworzy faktury.

## iPhone / iPad — Safari, Edge i ikona na ekranie głównym

Strona z manifestem `display: standalone` uruchamia się z ekranu głównego jako osobna aplikacja internetowa, także gdy ikonę dodano przez Edge. Rozpoznawanie mowy przez przeglądarkowe API ma ograniczenia i zgłoszone błędy zależne od wersji iOS, w tym przypadki, gdy pierwsza wypowiedź działa, a kolejne nie zwracają wyniku. Takie objawy zgłoszono również w zwykłym Safari. Dlatego na iPhonie i iPadzie panel wybiera domyślnie systemowe dyktowanie do zwykłego pola tekstowego:

1. Naciśnij mikrofon przy wybranym polu **Start**, **End** lub dacie.
2. Wybierz **PL** albo **EN** w panelu. Na klawiaturze telefonu wybierz również odpowiedni język, korzystając z przycisku globusa, jeśli potrzebny.
3. Naciśnij **mikrofon na klawiaturze iPhone’a** i powiedz np. „szósta trzydzieści rano” albo “six thirty AM”.
4. Zakończ dyktowanie, sprawdź tekst i naciśnij **Wpisz tekst / Use text** w panelu kalkulatora.
5. Jeśli godzina jest niejednoznaczna, wybierz właściwy wariant. Po wpisaniu nadal działa **Cofnij / Undo**.

Jeśli klawiatura nie pokazuje mikrofonu, sprawdź **Ustawienia → Ogólne → Klawiatura → Włącz dyktowanie** (*Settings → General → Keyboard → Enable Dictation*). Strona nie może samodzielnie nacisnąć systemowego mikrofonu ani włączyć ustawienia iOS. Język wybrany w kalkulatorze określa interpretację słów; język dyktowania zależy także od wybranej klawiatury.

Tekst dyktowania może pojawiać się częściami. Dlatego dopiero **Wpisz tekst / Use text** uruchamia parser i zmienia docelowe pole, a nie każde dopisane słowo. W tym samym polu można poprawić tekst, wpisać go ręcznie albo wkleić. Dostępny jest również przycisk pozwalający spróbować rozpoznawania przeglądarki.

### Mikrofon przeglądarki na iPhonie / iPadzie — poprawka v5

Aktualny panel ma oznaczenie **GŁOS · v5 / VOICE · v5**. Ta wersja zmienia opcjonalny tryb **Spróbuj mikrofonu przeglądarki**, który u części użytkowników iOS działa tylko przy pierwszej próbie. Domyślny wybór dyktowania klawiaturą pozostaje dostępny.

1. Naciśnij mikrofon przy wybranym polu i wybierz **Spróbuj mikrofonu przeglądarki**.
2. Telefon odtworzy krótki komunikat w wybranym języku. Poczekaj na napis **Słucham / Listening**.
3. Powiedz jedną godzinę lub datę i zrób krótką pauzę. Przeglądarka sama zakończy rozpoznawanie, a kalkulator wpisze lub poprosi o potwierdzenie wyniku.
4. W tym trybie na iPhonie przycisk **Anuluj słuchanie / Cancel listening** przerywa próbę bez zapisywania wyniku. Do zwykłego zatwierdzenia wypowiedzi wystarcza pauza.

Obejście opiera się na dwóch raportach w [zgłoszeniu WebKit 321436, komentarze 8–9](https://bugs.webkit.org/show_bug.cgi?id=321436#c8): słyszalny komunikat `speechSynthesis` przed każdą próbą, uruchomienie `SpeechRecognition` po zakończeniu komunikatu oraz naturalne zakończenie rozpoznawania. To obejście zgłoszone przez użytkowników, a nie potwierdzona naprawa WebKit ani gwarancja działania na każdym urządzeniu i w każdym języku.

Kod nie przerywa już poprawnej sesji iOS po 800 ms od końcowego wyniku i nie wywołuje ponownie `abort()` po naturalnym `end`. Anulowanie, ukrycie strony i limity czasu nadal zatrzymują aktywny mikrofon. Nowa próba nie nakłada się na poprzednią sesję iOS, która nie potwierdziła jeszcze zakończenia; panel pozwala ponowić próbę lub użyć klawiatury. Spóźnione zakończenie anulowanego komunikatu nie może uruchomić nowego nasłuchiwania. Jeśli przygotowanie dźwięku zawiedzie, panel udostępnia dyktowanie klawiaturą; nie włącza mikrofonu automatycznie inną metodą.

Próba na telefonie po aktualizacji: zapisz potrzebne dane przyciskiem **Save**, całkowicie zamknij kalkulator w przełączniku aplikacji i otwórz go ponownie z dostępem do internetu. Sprawdź oznaczenie **v5** i wykonaj co najmniej trzy wpisy jeden po drugim, np. Start → „szósta trzydzieści rano”, End → „osiemnasta”, Start kolejnego dnia → „siódma piętnaście rano”. W zwykłym Safari zamknij i uruchom ponownie Safari. Samo odświeżenie nie usuwało blokady silnika w zgłoszonych przypadkach. Nie trzeba usuwać danych witryny ani zapisanych formularzy.

Po ręcznym przerwaniu lub błędzie obejście może przestać pomagać. Jeśli kolejne próby nadal nie zwracają tekstu, użyj **Dyktuj klawiaturą / wpisz tekst**. Do dalszej diagnozy zachowaj widoczny komunikat i kod błędu oraz numer wersji iOS; nie są potrzebne nagrania ani treść faktury.

### Zatwierdzanie tekstu — poprawka v4 zachowana w v5

Naciśnięcie **Wpisz tekst** podczas kończenia dyktowania nie jest już ignorowane. Panel prosi pole o zakończenie edycji i czeka na końcowy tekst przed jego odczytaniem. Enter używany do wybierania lub zatwierdzania części tekstu na klawiaturze nadal nie zapisuje niegotowej godziny.

Jeżeli telefon nie potwierdzi zakończenia tekstu, panel zachowa wypowiedź i pokaże wskazówkę: zakończ dyktowanie przyciskiem klawiatury i ponownie naciśnij **Wpisz tekst**. Nie wpisze częściowego wyniku. Zmiana wybranego pola, języka lub formularza oraz zamknięcie panelu anulują oczekujące zatwierdzenie.

Poprawka v4 dotyczy obsługi tekstu z klawiatury. Jest niezależna od obejścia przeglądarkowego mikrofonu dodanego w v5. Gdy nie działa dyktowanie klawiatury, do diagnozy potrzebne są komunikat panelu i informacja, czy wypowiedziane słowa pojawiają się w jego polu tekstowym.

Na urządzeniach innych niż iPhone/iPad dotychczasowy tryb głosowy pozostaje domyślny. Jeżeli usługa rozpoznawania jest niedostępna lub zgłasza błąd, panel udostępnia tę samą alternatywę z klawiaturą.

## Telefony i prywatność

- Rozpoznawanie używa polskiego (`pl-PL`) lub brytyjskiego angielskiego (`en-GB`). Wskazówki panelu i etykiety mikrofonów zmieniają się wraz z wyborem języka mowy. Podstawowy interfejs kalkulatora zachowuje swój język i działanie.
- Bezpośrednie rozpoznawanie wymaga `SpeechRecognition` albo `webkitSpeechRecognition`. Alternatywne dyktowanie klawiaturą nie używa tego API. Dostępność obu metod zależy od urządzenia i ustawień.
- W Safari sprawdź zgodę na mikrofon oraz ustawienia Siri lub dyktowania. Porównanie zwykłej karty Safari z aplikacją otwieraną z ikony pomaga ustalić przyczynę problemu, ale samo otwarcie Safari nie gwarantuje rozpoznania.
- Rozpoznawanie może wymagać internetu. Przeglądarka albo system telefonu może wysłać dźwięk do swojego dostawcy rozpoznawania. Kalkulator nie zapisuje nagrań ani transkrypcji w pamięci trwałej i nie dodaje własnej usługi przesyłania dźwięku. Nie gwarantuje dyktowania offline w każdym języku.
- Bezpośredni mikrofon uruchamia się tylko w odpowiedzi na naciśnięcie przycisku. Na iOS poprzedza go krótki komunikat głosowy, którego zakończenie ma osobny limit 10 sekund. Oczekiwanie na start rozpoznawania lub zgodę ma limit 60 sekund; limit 20 sekund słuchania rozpoczyna się dopiero po uruchomieniu rozpoznawania. Zamknięcie panelu, zmiana tygodnia, ręczna zmiana formularza lub ukrycie strony unieważniają oczekujący wynik. Systemowe dyktowanie klawiatury uruchamia i kończy użytkownik przez kontrolki iOS.
- Ręczne wpisywanie pozostaje dostępne. Nie ma gwarancji bezbłędnego rozpoznania w hałasie; sprawdź wynik przed obliczeniem i wystawieniem faktury.

## Pliki i weryfikacja dla programisty

- `voice-parser.js`: niezależny, konserwatywny parser całej wypowiedzi; brak usług sieciowych.
- `voice-input.js`: przyciski, zarządzanie sesją, rozpoznawanie przeglądarki i alternatywne dyktowanie klawiaturą, interpretacja końcowego tekstu, cofanie i integracja z istniejącymi zdarzeniami pól React. Nie przenosi istniejących elementów pól. Panel zachowuje krótki kod błędu, odróżniając także brak startu od braku wyniku, bez zapisu nagrań.
- `voice-input.css`: dopasowany interfejs; na telefonie cel dotykowy mikrofonu ma 44 × 44 px.
- `sw.js`: cache v10 obejmuje pliki PL/EN w wersji `?v=5`, aby urządzenia pobrały poprawkę. Usuwane są wyłącznie stare cache tego kalkulatora, a nie innych aplikacji w tej samej domenie.

Testy parsera (bez zależności):

```sh
node --test tests/voice-parser.test.cjs tests/voice-parser-en.test.cjs
```

Testy integracyjne uruchamiają rzeczywisty pakiet React z `index.html` w JSDOM. Symulują zarówno zdarzenia przeglądarkowego rozpoznawania mowy, jak i tekst dostarczany przez dyktowanie klawiaturą. Wymagają Node.js 24 i zależności wyłącznie do testów:

```sh
npm install --no-save --no-package-lock jsdom@31.0.1
node --test tests/voice-input.test.cjs
```

Testy automatyczne sprawdzają interpretację tekstu, obsługę sesji, aktualizację rzeczywistego stanu formularza, obliczenia, zapis/odczyt, cofanie i brak nadpisywania nowszych zmian. Nie mierzą trafności rozpoznawania dźwięku przez usługę telefonu. Przed uznaniem zgodności konkretnego telefonu za potwierdzoną wykonaj próbę z jego rzeczywistym mikrofonem, również ze skrótu PWA, jeśli jest używany.

Dokumentacja dostawców:

- [MDN: SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [MDN: język rozpoznawania](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/lang)
- [WebKit: rozpoznawanie mowy w Safari i wymaganie Siri](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/)
- [WebKit: aplikacje z ekranu głównego, także dodane przez inne przeglądarki](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Apple: dyktowanie tekstu na iPhonie](https://support.apple.com/en-gb/guide/iphone/iph2c0651d2/ios)
- [WebKit 225298: historyczne ograniczenie Home Screen](https://bugs.webkit.org/show_bug.cgi?id=225298)
- [WebKit 321436: zgłoszenia problemów rozpoznawania w Safari i Home Screen](https://bugs.webkit.org/show_bug.cgi?id=321436)
