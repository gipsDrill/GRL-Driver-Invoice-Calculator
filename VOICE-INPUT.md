# Wprowadzanie dat i godzin głosem — PL / EN

Przy polach daty, Start i End znajduje się mikrofon. Naciśnij go, zezwól przeglądarce na mikrofon i powiedz krótkie polecenie w wybranym języku. Jedno nagranie dotyczy jednego wybranego pola.

W panelu mikrofonu wybierz **PL · Polski** lub **EN · English (UK)**. Wybór jest zapamiętywany na urządzeniu. Zmiana języka przerywa aktualne słuchanie i usuwa oczekujący wynik. Naciśnij **Powiedz po polsku / Speak in English**, aby rozpocząć nową wypowiedź. Jednocześnie działa tylko jedna sesja rozpoznawania w wybranym języku.

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

## Telefony i prywatność

- Rozpoznawanie używa polskiego (`pl-PL`) lub brytyjskiego angielskiego (`en-GB`). Wskazówki panelu i etykiety mikrofonów zmieniają się wraz z wyborem języka mowy. Podstawowy interfejs kalkulatora zachowuje swój język i działanie.
- Wymagana jest obsługa `SpeechRecognition` albo `webkitSpeechRecognition`. Rozsądnym punktem startu jest Chrome na Androidzie lub Safari na iPhonie. Dostępność zależy od urządzenia i przeglądarki.
- W Safari sprawdź zgodę na mikrofon oraz włączenie Siri w ustawieniach urządzenia. Jeżeli skrót z ekranu głównego nie działa, otwórz stronę bezpośrednio w Safari.
- Rozpoznawanie może wymagać internetu. Przeglądarka może wysłać dźwięk do własnego dostawcy rozpoznawania. Kalkulator nie zapisuje nagrań ani transkrypcji w pamięci trwałej i nie dodaje własnej usługi przesyłania dźwięku.
- Mikrofon uruchamia się tylko po naciśnięciu przycisku. Zamknięcie panelu, ponowne naciśnięcie mikrofonu, zmiana tygodnia lub ukrycie strony kończą sesję. Sesja bez wyniku wygasa po 20 sekundach.
- Ręczne wpisywanie pozostaje dostępne. Nie ma gwarancji bezbłędnego rozpoznania w hałasie; sprawdź wynik przed obliczeniem i wystawieniem faktury.

## Pliki i weryfikacja dla programisty

- `voice-parser.js`: niezależny, konserwatywny parser całej wypowiedzi; brak usług sieciowych.
- `voice-input.js`: przyciski, zarządzanie sesją, interpretacja wyników końcowych, cofanie i integracja z istniejącymi zdarzeniami pól React. Nie przenosi istniejących elementów pól.
- `voice-input.css`: dopasowany interfejs; na telefonie cel dotykowy mikrofonu ma 44 × 44 px.
- `sw.js`: cache v7 obejmuje nowe pliki PL/EN w wersji `?v=2`. Usuwane są wyłącznie stare cache tego kalkulatora, a nie innych aplikacji w tej samej domenie.

Testy parsera (bez zależności):

```sh
node --test tests/voice-parser.test.cjs tests/voice-parser-en.test.cjs
```

Testy integracyjne uruchamiają rzeczywisty pakiet React z `index.html` w JSDOM i symulują zdarzenia przeglądarkowego rozpoznawania mowy. Wymagają Node.js 24 i zależności wyłącznie do testów:

```sh
npm install --no-save --no-package-lock jsdom@31.0.1
node --test tests/voice-input.test.cjs
```

Testy automatyczne sprawdzają interpretację tekstu, obsługę sesji, aktualizację rzeczywistego stanu formularza, obliczenia, zapis/odczyt, cofanie i brak nadpisywania nowszych zmian. Nie mierzą trafności rozpoznawania dźwięku przez usługę telefonu. Przed uznaniem zgodności konkretnego telefonu za potwierdzoną wykonaj próbę z jego rzeczywistym mikrofonem, również ze skrótu PWA, jeśli jest używany.

Dokumentacja dostawców:

- [MDN: SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [MDN: język rozpoznawania](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/lang)
- [WebKit: rozpoznawanie mowy w Safari i wymaganie Siri](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/)
