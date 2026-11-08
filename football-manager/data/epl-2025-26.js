// Премьер-лига, сезон 2025/26.
// Формат строки игрока: Имя|Позиция(GK/DF/MF/FW)|Возраст на старт сезона|Рейтинг (1–99)
// Рейтинги — игровая оценка, а не официальные данные. Правьте свободно.
window.FM_DATA = window.FM_DATA || { leagues: [] };
window.FM_DATA.leagues.push({
  id: 'epl',
  name: 'Премьер-лига',
  country: 'Англия',
  season: 2025,
  clubs: [
    { id: 'ARS', name: 'Арсенал', rep: 92, budget: 90, colors: ['#EF0107', '#FFFFFF'], stadium: 'Эмирейтс', players: `
David Raya|GK|29|87
Kepa Arrizabalaga|GK|30|79
William Saliba|DF|24|88
Gabriel Magalhães|DF|27|87
Jurriën Timber|DF|24|84
Ben White|DF|27|82
Riccardo Calafiori|DF|23|81
Piero Hincapié|DF|23|82
Cristhian Mosquera|DF|21|77
Myles Lewis-Skelly|DF|18|77
Declan Rice|MF|26|88
Martin Ødegaard|MF|26|86
Martín Zubimendi|MF|26|86
Mikel Merino|MF|29|82
Eberechi Eze|MF|27|84
Christian Nørgaard|MF|31|77
Ethan Nwaneri|MF|18|77
Bukayo Saka|FW|23|88
Noni Madueke|FW|23|80
Gabriel Martinelli|FW|24|81
Leandro Trossard|FW|30|81
Viktor Gyökeres|FW|27|85
Kai Havertz|FW|26|82` },

    { id: 'AVL', name: 'Астон Вилла', rep: 82, budget: 45, colors: ['#670E36', '#95BFE5'], stadium: 'Вилла Парк', players: `
Emiliano Martínez|GK|32|85
Marco Bizot|GK|34|75
Ezri Konsa|DF|27|82
Pau Torres|DF|28|81
Matty Cash|DF|27|79
Lucas Digne|DF|32|78
Ian Maatsen|DF|23|78
Tyrone Mings|DF|32|76
Victor Lindelöf|DF|31|76
Andrés García|DF|22|73
Youri Tielemans|MF|28|83
Boubacar Kamara|MF|25|82
John McGinn|MF|30|80
Amadou Onana|MF|24|80
Morgan Rogers|MF|23|84
Emiliano Buendía|MF|28|77
Harvey Elliott|MF|22|78
Lamare Bogarde|MF|21|72
Jadon Sancho|FW|25|78
Evann Guessand|FW|24|76
Ollie Watkins|FW|29|84
Donyell Malen|FW|26|79` },

    { id: 'BOU', name: 'Борнмут', rep: 75, budget: 35, colors: ['#DA291C', '#111111'], stadium: 'Виталити', players: `
Đorđe Petrović|GK|25|79
Will Dennis|GK|25|68
Marcos Senesi|DF|28|79
Adrien Truffert|DF|23|77
Bafodé Diakité|DF|24|76
James Hill|DF|23|73
Adam Smith|DF|34|72
Julián Araujo|DF|23|75
Álex Jiménez|DF|20|75
Alex Scott|MF|22|79
Tyler Adams|MF|26|78
Ryan Christie|MF|30|76
Lewis Cook|MF|28|75
Marcus Tavernier|MF|26|79
David Brooks|MF|28|75
Amine Adli|MF|25|76
Justin Kluivert|FW|26|80
Antoine Semenyo|FW|25|83
Evanilson|FW|25|78
Eli Junior Kroupi|FW|19|76
Enes Ünal|FW|28|73` },

    { id: 'BRE', name: 'Брентфорд', rep: 75, budget: 30, colors: ['#E30613', '#FFFFFF'], stadium: 'Джитек Комьюнити', players: `
Caoimhín Kelleher|GK|26|81
Hákon Valdimarsson|GK|23|70
Nathan Collins|DF|24|78
Kristoffer Ajer|DF|27|76
Sepp van den Berg|DF|23|78
Ethan Pinnock|DF|32|75
Michael Kayode|DF|21|76
Aaron Hickey|DF|23|75
Rico Henry|DF|28|74
Keane Lewis-Potter|DF|24|76
Mathias Jensen|MF|29|77
Vitaly Janelt|MF|27|76
Yehor Yarmolyuk|MF|21|76
Jordan Henderson|MF|35|74
Mikkel Damsgaard|MF|25|79
Fábio Carvalho|MF|23|74
Kevin Schade|FW|23|79
Dango Ouattara|FW|23|77
Igor Thiago|FW|24|81
Reiss Nelson|FW|25|74` },

    { id: 'BHA', name: 'Брайтон', rep: 79, budget: 45, colors: ['#0057B8', '#FFFFFF'], stadium: 'Амекс', players: `
Bart Verbruggen|GK|22|80
Jason Steele|GK|35|70
Jan Paul van Hecke|DF|25|80
Lewis Dunk|DF|33|77
Joël Veltman|DF|33|74
Maxim De Cuyper|DF|24|77
Ferdi Kadıoğlu|DF|25|78
Mats Wieffer|DF|25|77
Olivier Boscagli|DF|27|75
Carlos Baleba|MF|21|82
Jack Hinshelwood|MF|20|77
Yasin Ayari|MF|21|78
Diego Gómez|MF|22|76
James Milner|MF|39|72
Brajan Gruda|MF|21|75
Kaoru Mitoma|FW|28|81
Yankuba Minteh|FW|21|79
Georginio Rutter|FW|23|78
Danny Welbeck|FW|34|76
Solly March|FW|31|76
Stefanos Tzimas|FW|19|74
Charalampos Kostoulas|FW|18|73` },

    { id: 'BUR', name: 'Бернли', rep: 68, budget: 20, colors: ['#6C1D45', '#99D6EA'], stadium: 'Терф Мур', players: `
Martin Dúbravka|GK|36|76
Max Weiß|GK|21|70
Kyle Walker|DF|35|76
Maxime Estève|DF|23|75
Hjalmar Ekdal|DF|26|73
Quilindschy Hartman|DF|23|75
Lucas Pires|DF|24|73
Joe Worrall|DF|28|72
Connor Roberts|DF|29|72
Josh Cullen|MF|29|75
Lesley Ugochukwu|MF|21|75
Florentino Luís|MF|25|76
Josh Laurent|MF|30|73
Hannibal Mejbri|MF|22|75
Marcus Edwards|MF|26|74
Jaidon Anthony|FW|25|76
Zian Flemming|FW|27|75
Lyle Foster|FW|24|73
Loum Tchaouna|FW|21|74
Armando Broja|FW|23|74` },

    { id: 'CHE', name: 'Челси', rep: 90, budget: 100, colors: ['#034694', '#FFFFFF'], stadium: 'Стэмфорд Бридж', players: `
Robert Sánchez|GK|27|79
Filip Jörgensen|GK|23|77
Reece James|DF|25|84
Levi Colwill|DF|22|82
Wesley Fofana|DF|24|80
Trevoh Chalobah|DF|26|80
Marc Cucurella|DF|27|83
Malo Gusto|DF|22|79
Jorrel Hato|DF|19|78
Benoît Badiashile|DF|24|77
Josh Acheampong|DF|19|73
Moisés Caicedo|MF|23|88
Enzo Fernández|MF|24|85
Roméo Lavia|MF|21|79
Andrey Santos|MF|21|78
Cole Palmer|MF|23|87
Pedro Neto|FW|25|81
Estêvão|FW|18|81
Alejandro Garnacho|FW|21|79
Jamie Gittens|FW|21|77
João Pedro|FW|23|82
Liam Delap|FW|22|78` },

    { id: 'CRY', name: 'Кристал Пэлас', rep: 77, budget: 30, colors: ['#1B458F', '#C4122E'], stadium: 'Селхерст Парк', players: `
Dean Henderson|GK|28|81
Walter Benítez|GK|32|74
Marc Guéhi|DF|25|84
Maxence Lacroix|DF|25|81
Chris Richards|DF|25|78
Daniel Muñoz|DF|29|81
Tyrick Mitchell|DF|25|78
Nathaniel Clyne|DF|34|72
Jaydee Canvot|DF|19|74
Borna Sosa|DF|27|74
Adam Wharton|MF|21|82
Jefferson Lerma|MF|30|77
Will Hughes|MF|30|76
Daichi Kamada|MF|29|78
Justin Devenny|MF|21|72
Ismaïla Sarr|FW|27|81
Yeremy Pino|FW|22|78
Jean-Philippe Mateta|FW|28|82
Eddie Nketiah|FW|26|75
Romain Esse|FW|20|73` },

    { id: 'EVE', name: 'Эвертон', rep: 78, budget: 35, colors: ['#003399', '#FFFFFF'], stadium: 'Хилл-Дикинсон', players: `
Jordan Pickford|GK|31|83
Mark Travers|GK|26|73
James Tarkowski|DF|32|79
Jarrad Branthwaite|DF|23|80
Jake O'Brien|DF|24|78
Vitaliy Mykolenko|DF|26|77
Michael Keane|DF|32|75
Nathan Patterson|DF|23|74
Séamus Coleman|DF|36|70
Idrissa Gueye|MF|35|76
James Garner|MF|24|78
Tim Iroegbunam|MF|22|74
Kiernan Dewsbury-Hall|MF|26|79
Jack Grealish|MF|29|81
Carlos Alcaraz|MF|22|76
Dwight McNeil|MF|25|77
Iliman Ndiaye|FW|25|80
Tyler Dibling|FW|19|75
Thierno Barry|FW|22|76
Beto|FW|27|75` },

    { id: 'FUL', name: 'Фулхэм', rep: 75, budget: 25, colors: ['#F5F5F5', '#111111'], stadium: 'Крейвен Коттедж', players: `
Bernd Leno|GK|33|81
Benjamin Lecomte|GK|34|70
Joachim Andersen|DF|29|79
Calvin Bassey|DF|25|77
Issa Diop|DF|28|76
Kenny Tete|DF|29|77
Antonee Robinson|DF|28|78
Timothy Castagne|DF|29|76
Jorge Cuenca|DF|25|73
Sander Berge|MF|27|78
Saša Lukić|MF|29|76
Alex Iwobi|MF|29|79
Emile Smith Rowe|MF|25|78
Andreas Pereira|MF|29|79
Tom Cairney|MF|34|72
Harry Wilson|FW|28|79
Adama Traoré|FW|29|76
Samuel Chukwueze|FW|26|77
Kevin|FW|22|76
Rodrigo Muniz|FW|24|77
Raúl Jiménez|FW|34|76` },

    { id: 'LEE', name: 'Лидс Юнайтед', rep: 72, budget: 30, colors: ['#FFFFFF', '#1D428A'], stadium: 'Элланд Роуд', players: `
Lucas Perri|GK|27|77
Illan Meslier|GK|25|74
Karl Darlow|GK|34|70
Joe Rodon|DF|27|77
Pascal Struijk|DF|26|76
Jaka Bijol|DF|26|78
Jayden Bogle|DF|25|74
Gabriel Gudmundsson|DF|26|75
James Justin|DF|27|75
Sebastiaan Bornauw|DF|26|73
Ethan Ampadu|MF|24|77
Anton Stach|MF|26|78
Ao Tanaka|MF|26|76
Sean Longstaff|MF|27|75
Ilia Gruev|MF|25|74
Brenden Aaronson|MF|24|75
Daniel James|FW|27|75
Willy Gnonto|FW|21|75
Noah Okafor|FW|25|77
Dominic Calvert-Lewin|FW|28|78
Lukas Nmecha|FW|26|75
Joël Piroe|FW|26|75` },

    { id: 'LIV', name: 'Ливерпуль', rep: 94, budget: 100, colors: ['#C8102E', '#F6EB61'], stadium: 'Энфилд', players: `
Alisson Becker|GK|32|87
Giorgi Mamardashvili|GK|24|81
Virgil van Dijk|DF|34|87
Ibrahima Konaté|DF|26|84
Joe Gomez|DF|28|78
Giovanni Leoni|DF|18|74
Jeremie Frimpong|DF|24|82
Conor Bradley|DF|22|79
Milos Kerkez|DF|21|81
Andrew Robertson|DF|31|79
Ryan Gravenberch|MF|23|86
Alexis Mac Allister|MF|26|85
Dominik Szoboszlai|MF|24|86
Florian Wirtz|MF|22|87
Curtis Jones|MF|24|79
Wataru Endo|MF|32|76
Mohamed Salah|FW|33|87
Cody Gakpo|FW|26|83
Hugo Ekitike|FW|23|84
Alexander Isak|FW|25|86
Federico Chiesa|FW|27|77
Rio Ngumoha|FW|16|71` },

    { id: 'MCI', name: 'Манчестер Сити', rep: 95, budget: 110, colors: ['#6CABDD', '#1C2C5B'], stadium: 'Этихад', players: `
Gianluigi Donnarumma|GK|26|88
James Trafford|GK|22|78
Rúben Dias|DF|28|86
Joško Gvardiol|DF|23|86
John Stones|DF|31|81
Nathan Aké|DF|30|80
Abdukodir Khusanov|DF|21|79
Rayan Aït-Nouri|DF|24|81
Matheus Nunes|DF|26|80
Rico Lewis|DF|20|79
Rodri|MF|29|88
Tijjani Reijnders|MF|27|84
Bernardo Silva|MF|31|84
Phil Foden|MF|25|85
Rayan Cherki|MF|22|83
Nico González|MF|23|80
Mateo Kovačić|MF|31|80
Jérémy Doku|FW|23|83
Savinho|FW|21|80
Omar Marmoush|FW|26|82
Erling Haaland|FW|25|91
Oscar Bobb|FW|22|75` },

    { id: 'MUN', name: 'Манчестер Юнайтед', rep: 88, budget: 80, colors: ['#DA291C', '#FBE122'], stadium: 'Олд Траффорд', players: `
Senne Lammens|GK|23|79
Altay Bayındır|GK|27|74
André Onana|GK|29|78
Matthijs de Ligt|DF|26|82
Lisandro Martínez|DF|27|81
Harry Maguire|DF|32|78
Leny Yoro|DF|19|78
Luke Shaw|DF|30|77
Diogo Dalot|DF|26|79
Noussair Mazraoui|DF|27|78
Patrick Dorgu|DF|20|76
Ayden Heaven|DF|18|73
Bruno Fernandes|MF|30|85
Casemiro|MF|33|78
Kobbie Mainoo|MF|20|79
Manuel Ugarte|MF|24|77
Mason Mount|MF|26|77
Matheus Cunha|FW|26|83
Bryan Mbeumo|FW|26|83
Benjamin Šeško|FW|22|80
Amad Diallo|FW|23|80
Joshua Zirkzee|FW|24|75` },

    { id: 'NEW', name: 'Ньюкасл', rep: 84, budget: 70, colors: ['#241F20', '#FFFFFF'], stadium: 'Сент-Джеймс Парк', players: `
Nick Pope|GK|33|81
Aaron Ramsdale|GK|27|78
Sven Botman|DF|25|80
Malick Thiaw|DF|24|80
Fabian Schär|DF|33|77
Dan Burn|DF|33|78
Kieran Trippier|DF|34|76
Tino Livramento|DF|22|80
Lewis Hall|DF|20|78
Emil Krafth|DF|31|72
Bruno Guimarães|MF|27|87
Sandro Tonali|MF|25|84
Joelinton|MF|29|81
Jacob Ramsey|MF|24|77
Joe Willock|MF|26|75
Lewis Miley|MF|19|77
Anthony Gordon|FW|24|83
Harvey Barnes|FW|27|77
Anthony Elanga|FW|23|79
Jacob Murphy|FW|30|77
Nick Woltemade|FW|23|81
Yoane Wissa|FW|28|79` },

    { id: 'NFO', name: 'Ноттингем Форест', rep: 78, budget: 40, colors: ['#DD0000', '#FFFFFF'], stadium: 'Сити Граунд', players: `
Matz Sels|GK|33|80
John Victor|GK|29|72
Murillo|DF|23|82
Nikola Milenković|DF|27|81
Ola Aina|DF|28|78
Neco Williams|DF|24|77
Morato|DF|24|76
Nicolò Savona|DF|22|75
Zach Abbott|DF|19|70
Elliot Anderson|MF|22|83
Ibrahim Sangaré|MF|27|78
Nicolás Domínguez|MF|27|77
Douglas Luiz|MF|27|79
Ryan Yates|MF|27|74
Morgan Gibbs-White|MF|25|83
James McAtee|MF|22|77
Callum Hudson-Odoi|FW|24|79
Dan Ndoye|FW|24|79
Dilane Bakwa|FW|22|77
Omari Hutchinson|FW|21|77
Chris Wood|FW|33|80
Igor Jesus|FW|24|77
Arnaud Kalimuendo|FW|23|77` },

    { id: 'SUN', name: 'Сандерленд', rep: 70, budget: 30, colors: ['#EB172B', '#FFFFFF'], stadium: 'Стэдиум оф Лайт', players: `
Robin Roefs|GK|22|78
Anthony Patterson|GK|25|71
Omar Alderete|DF|28|76
Dan Ballard|DF|25|75
Nordi Mukiele|DF|27|78
Reinildo Mandava|DF|31|76
Trai Hume|DF|23|75
Lutsharel Geertruida|DF|25|76
Luke O'Nien|DF|30|72
Granit Xhaka|MF|32|82
Noah Sadiki|MF|20|77
Enzo Le Fée|MF|25|78
Habib Diarra|MF|21|77
Dan Neil|MF|23|73
Chris Rigg|MF|18|72
Chemsdine Talbi|FW|20|77
Simon Adingra|FW|23|76
Bertrand Traoré|FW|30|74
Wilson Isidor|FW|25|77
Brian Brobbey|FW|23|76
Eliezer Mayenda|FW|20|74` },

    { id: 'TOT', name: 'Тоттенхэм', rep: 85, budget: 70, colors: ['#132257', '#FFFFFF'], stadium: 'Тоттенхэм Хотспур', players: `
Guglielmo Vicario|GK|28|82
Antonín Kinský|GK|22|74
Cristian Romero|DF|27|85
Micky van de Ven|DF|24|84
Kevin Danso|DF|26|79
Radu Drăgușin|DF|23|77
Pedro Porro|DF|25|81
Destiny Udogie|DF|22|79
Djed Spence|DF|24|77
Archie Gray|DF|19|76
Rodrigo Bentancur|MF|28|79
Yves Bissouma|MF|28|78
Pape Matar Sarr|MF|22|79
João Palhinha|MF|30|80
James Maddison|MF|28|81
Lucas Bergvall|MF|19|77
Xavi Simons|MF|22|82
Mohammed Kudus|FW|25|82
Dejan Kulusevski|FW|25|81
Brennan Johnson|FW|24|79
Wilson Odobert|FW|20|75
Mathys Tel|FW|20|76
Randal Kolo Muani|FW|26|79
Dominic Solanke|FW|27|79
Richarlison|FW|28|77` },

    { id: 'WHU', name: 'Вест Хэм', rep: 79, budget: 35, colors: ['#7A263A', '#1BB1E7'], stadium: 'Лондон Стэдиум', players: `
Alphonse Areola|GK|32|77
Mads Hermansen|GK|25|77
Max Kilman|DF|28|77
Jean-Clair Todibo|DF|25|78
Konstantinos Mavropanos|DF|27|76
Aaron Wan-Bissaka|DF|27|78
El Hadji Malick Diouf|DF|20|77
Kyle Walker-Peters|DF|28|75
Igor Julio|DF|27|75
Tomáš Souček|MF|30|78
Lucas Paquetá|MF|28|81
James Ward-Prowse|MF|30|76
Mateus Fernandes|MF|21|77
Soungoutou Magassa|MF|21|75
Guido Rodríguez|MF|31|75
Jarrod Bowen|FW|28|82
Crysencio Summerville|FW|23|79
Niclas Füllkrug|FW|32|75
Callum Wilson|FW|33|75
Luis Guilherme|FW|19|72` },

    { id: 'WOL', name: 'Вулверхэмптон', rep: 74, budget: 25, colors: ['#FDB913', '#231F20'], stadium: 'Молинью', players: `
José Sá|GK|32|78
Sam Johnstone|GK|32|75
Emmanuel Agbadou|DF|28|77
Yerson Mosquera|DF|24|76
Santiago Bueno|DF|26|74
Toti Gomes|DF|26|75
Matt Doherty|DF|33|73
Hugo Bueno|DF|22|74
Ki-Jana Hoever|DF|23|72
Jackson Tchatchoua|DF|24|74
João Gomes|MF|24|78
André|MF|24|77
Marshall Munetsi|MF|29|75
Jean-Ricner Bellegarde|MF|27|77
Fer López|MF|21|74
Jhon Arias|FW|27|76
Hwang Hee-chan|FW|29|76
Jørgen Strand Larsen|FW|25|78
Tolu Arokodare|FW|24|74
Rodrigo Gomes|FW|22|74
Mateus Mané|FW|18|72` },
  ]
});
