/*
 * MarkdownPoint - Plugin for Obsidian
 * Copyright (c) 2026 Johan Sanneblad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// Copied from Notebook Navigator, which owns the MarkdownPoint banner. Do not edit by hand.

export interface MarkdownPointBannerText {
    heading: string;
    credit: string;
    messages: readonly { headline: string; subtext: string }[];
}

/** Keyed by Obsidian's language codes, as the plugin's own catalogs are */
export const markdownPointBannerText: Readonly<Record<string, MarkdownPointBannerText>> = {
    ar: {
        heading: 'هل تستخدم Canva أو Keynote أو PowerPoint؟',
        credit: 'من تطوير Johan Sanneblad',
        messages: [
            {
                headline: 'اكتب شرائحك بـ Markdown.',
                subtext: 'اسحب النصوص والصور إلى حيث تريد.'
            },
            {
                headline: 'بديل مجاني لـ PowerPoint.',
                subtext: 'المشاركة والتعاون مجانيان أيضًا.'
            },
            {
                headline: 'كل عرض تقديمي مجلد على حاسوبك.',
                subtext: 'لا تحتاج إلى حساب لإنشاء الشرائح.'
            },
            {
                headline: 'أضف الحركة كما في Apple Motion.',
                subtext: 'استخدم الإطارات المفتاحية والمسارات والتحويلات.'
            },
            {
                headline: 'ضع نماذج ثلاثية الأبعاد على شرائحك.',
                subtext: 'افتح ملف GLB أو glTF، أو أنشئ نموذجًا باستخدام Meshy.'
            },
            {
                headline: 'تعاون كما في Google Slides.',
                subtext: 'شاهد مؤشرات الجميع وتعليقاتهم.'
            },
            {
                headline: 'شاهد نصوص كل الشرائح في مكان واحد.',
                subtext: 'افتح View > Outline وحرّرها بـ Markdown.'
            },
            {
                headline: 'حاذِ العناصر كما في Figma.',
                subtext: 'تصطف حسب المسافات والأحجام والزوايا.'
            },
            {
                headline: 'صدّر عرضك فيديو بدقة 4K.',
                subtext: 'لا تحتاج إلى After Effects لتحريكه.'
            },
            {
                headline: 'اجعل الشخصيات ثلاثية الأبعاد تمشي أو تركض.',
                subtext: 'استخدم Meshy لبناء الهيكل والتحريك.'
            },
            {
                headline: 'ميّز الكلمات بـ ==علامات التساوي==.',
                subtext: '**الغامق** و*المائل* يعملان تمامًا كما في Obsidian.'
            },
            {
                headline: 'استخدم التخطيط التلقائي كما في Figma.',
                subtext: 'رتّب مجموعة في صف أو عمود.'
            },
            {
                headline: 'شارك عرضك برابط.',
                subtext: 'انشره على الإنترنت بحساب مجاني.'
            },
            {
                headline: 'إضاءة ثلاثية الأبعاد كما في Blender.',
                subtext: 'أضواء نقطية وشمسية وبقعية ومساحية مع ظلال.'
            },
            {
                headline: 'تتبّع عروضك في Git.',
                subtext: 'العروض ملفات نصية بصيغة Markdown وJSON.'
            },
            {
                headline: 'أنشئ مكونات كما في Figma.',
                subtext: 'عدّلها مرة واحدة فتتغير كل النسخ.'
            },
            {
                headline: 'تصفّح السمات كما في Obsidian.',
                subtext: 'ثبّت سمة مجانية بنقرة واحدة.'
            },
            {
                headline: 'احفظ عروضك في مجلد متزامن.',
                subtext: 'تعمل مع Dropbox وiCloud Drive وOneDrive.'
            },
            {
                headline: 'ثلاثي الأبعاد بفيزياء الأجسام الصلبة.',
                subtext: 'أسقِط الأجسام أو اقلبها أو كدّسها.'
            },
            {
                headline: 'ملاحظات المتحدث بـ Markdown أيضًا.',
                subtext: 'تُحفظ في ملف الشرائح نفسه.'
            },
            {
                headline: 'ادمج الأشكال كما في Figma.',
                subtext: 'وحّد أو اطرح أو قاطع أو استبعد.'
            },
            {
                headline: 'ضع الكود على شرائحك.',
                subtext: 'كتل الكود ملوّنة لـ 21 لغة برمجة.'
            },
            {
                headline: 'مجاني للاستخدام الشخصي والتجاري.',
                subtext: 'نزّله لـ Mac أو Windows.'
            }
        ]
    },
    de: {
        heading: 'Nutzt du Canva, Keynote oder PowerPoint?',
        credit: 'von Johan Sanneblad',
        messages: [
            {
                headline: 'Schreib deine Folien in Markdown.',
                subtext: 'Zieh Text und Bilder an die richtige Stelle.'
            },
            {
                headline: 'Eine Gratis-Alternative zu PowerPoint.',
                subtext: 'Auch Teilen und Zusammenarbeit sind gratis.'
            },
            {
                headline: 'Deine Folien liegen auf deinem Rechner.',
                subtext: 'Du brauchst kein Konto, um Folien zu erstellen.'
            },
            {
                headline: 'Animiere wie mit Apple Motion.',
                subtext: 'Nutze Keyframes, Pfade und Morphs.'
            },
            {
                headline: 'Bring 3D-Modelle auf deine Folien.',
                subtext: 'Öffne GLB- oder glTF-Dateien oder nutze Meshy.'
            },
            {
                headline: 'Arbeite zusammen wie in Google Slides.',
                subtext: 'Du siehst alle Zeiger und Kommentare.'
            },
            {
                headline: 'Sieh alle Folientexte an einem Ort.',
                subtext: 'Öffne View > Outline und bearbeite in Markdown.'
            },
            {
                headline: 'Objekte rasten wie in Figma ein.',
                subtext: 'Ausrichten nach Abstand, Größe und Winkel.'
            },
            {
                headline: 'Exportiere deine Folien als 4K-Video.',
                subtext: 'Zum Animieren brauchst du kein After Effects.'
            },
            {
                headline: 'Lass 3D-Figuren gehen oder rennen.',
                subtext: 'Nutze Meshy für Rigging und Animation.'
            },
            {
                headline: 'Markieren mit ==Gleichheitszeichen==.',
                subtext: '**Fett** und *kursiv* gehen genau wie in Obsidian.'
            },
            {
                headline: 'Nutze Auto-Layout wie in Figma.',
                subtext: 'Richte eine Gruppe in Zeile oder Spalte aus.'
            },
            {
                headline: 'Teile Präsentationen per Link.',
                subtext: 'Stell sie mit einem Gratis-Konto online.'
            },
            {
                headline: '3D-Beleuchtung wie in Blender.',
                subtext: 'Punkt, Sonne, Spot und Fläche mit Schatten.'
            },
            {
                headline: 'Verwalte deine Präsentationen in Git.',
                subtext: 'Es sind Markdown- und JSON-Textdateien.'
            },
            {
                headline: 'Baue Komponenten wie in Figma.',
                subtext: 'Bearbeite sie einmal und jede Instanz ändert sich.'
            },
            {
                headline: 'Stöbere in Themes wie bei Obsidian.',
                subtext: 'Installiere ein Gratis-Theme mit einem Klick.'
            },
            {
                headline: 'Nutze einen synchronisierten Ordner.',
                subtext: 'Dropbox, iCloud Drive und OneDrive funktionieren.'
            },
            {
                headline: '3D mit Starrkörperphysik.',
                subtext: 'Lass Objekte fallen, kippen oder sich stapeln.'
            },
            {
                headline: 'Sprechernotizen sind auch Markdown.',
                subtext: 'Sie stehen in derselben Datei wie die Folien.'
            },
            {
                headline: 'Kombiniere Formen wie in Figma.',
                subtext: 'Vereinen, abziehen, schneiden oder ausschließen.'
            },
            {
                headline: 'Zeig Code auf deinen Folien.',
                subtext: 'Code wird in 21 Sprachen hervorgehoben.'
            },
            {
                headline: 'Privat und beruflich gratis.',
                subtext: 'Lade es für Mac oder Windows herunter.'
            }
        ]
    },
    en: {
        heading: 'Do you use Canva, Keynote or PowerPoint?',
        credit: 'by Johan Sanneblad',
        messages: [
            {
                headline: 'Write your slides in Markdown.',
                subtext: 'Drag text and images where you want them.'
            },
            {
                headline: 'A free alternative to PowerPoint.',
                subtext: 'Sharing and collaboration are free too.'
            },
            {
                headline: 'Each deck is a folder on your computer.',
                subtext: 'You don’t need an account to make slides.'
            },
            {
                headline: 'Animate like Apple Motion.',
                subtext: 'Use keyframes, paths and morphs.'
            },
            {
                headline: 'Put 3D models on your slides.',
                subtext: 'Open a GLB or glTF file, or make one with Meshy.'
            },
            {
                headline: 'Collaborate like Google Slides.',
                subtext: 'See everyone’s pointer and comments.'
            },
            {
                headline: 'See every slide’s text in one place.',
                subtext: 'Open View > Outline and edit as Markdown.'
            },
            {
                headline: 'Snap objects like Figma.',
                subtext: 'Line up by spacing, size and angle.'
            },
            {
                headline: 'Export your deck as a 4K video.',
                subtext: 'You don’t need After Effects to animate it.'
            },
            {
                headline: 'Make 3D characters walk or run.',
                subtext: 'Use Meshy for rigging and animation.'
            },
            {
                headline: 'Highlight words with ==equal signs==.',
                subtext: '**Bold** and *italic* work just like Obsidian.'
            },
            {
                headline: 'Use auto layout like Figma.',
                subtext: 'Line up a group in a row or a column.'
            },
            {
                headline: 'Share a deck with a link.',
                subtext: 'Publish it online with a free account.'
            },
            {
                headline: '3D lighting like Blender.',
                subtext: 'Point, sun, spot and area lights with shadows.'
            },
            {
                headline: 'Track your decks in Git.',
                subtext: 'Decks are Markdown and JSON text files.'
            },
            {
                headline: 'Build components like Figma.',
                subtext: 'Edit a composition and its instances change.'
            },
            {
                headline: 'Browse themes like in Obsidian.',
                subtext: 'Install a free theme in one click.'
            },
            {
                headline: 'Keep your decks in a synced folder.',
                subtext: 'Dropbox, iCloud Drive and OneDrive all work.'
            },
            {
                headline: '3D with rigid-body physics.',
                subtext: 'Drop, tip or pile objects.'
            },
            {
                headline: 'Presenter notes are Markdown too.',
                subtext: 'They’re saved in the same file as the slides.'
            },
            {
                headline: 'Combine shapes like Figma.',
                subtext: 'Unite, subtract, intersect or exclude.'
            },
            {
                headline: 'Put code on your slides.',
                subtext: 'Code blocks are highlighted in 21 languages.'
            },
            {
                headline: 'Free for personal and commercial use.',
                subtext: 'Download it for Mac or Windows.'
            }
        ]
    },
    es: {
        heading: '¿Usas Canva, Keynote o PowerPoint?',
        credit: 'por Johan Sanneblad',
        messages: [
            {
                headline: 'Escribe tus diapositivas en Markdown.',
                subtext: 'Arrastra textos e imágenes adonde quieras.'
            },
            {
                headline: 'Una alternativa gratis a PowerPoint.',
                subtext: 'Compartir y colaborar también es gratis.'
            },
            {
                headline: 'Tus diapos están en tu ordenador.',
                subtext: 'No necesitas una cuenta para crear diapos.'
            },
            {
                headline: 'Anima como en Apple Motion.',
                subtext: 'Usa fotogramas clave, trayectorias y morphs.'
            },
            {
                headline: 'Pon modelos 3D en tus diapositivas.',
                subtext: 'Abre un GLB o glTF, o genera uno con Meshy.'
            },
            {
                headline: 'Colabora como en Google Slides.',
                subtext: 'Ve los punteros y comentarios de todos.'
            },
            {
                headline: 'Ve todo el texto en un solo lugar.',
                subtext: 'Abre View > Outline y edítalo en Markdown.'
            },
            {
                headline: 'Encaja objetos como en Figma.',
                subtext: 'Alinéalos por espaciado, tamaño y ángulo.'
            },
            {
                headline: 'Exporta tu presentación en vídeo 4K.',
                subtext: 'No necesitas After Effects para animarla.'
            },
            {
                headline: 'Personajes 3D que caminan y corren.',
                subtext: 'Usa Meshy para el rigging y la animación.'
            },
            {
                headline: 'Resalta con ==signos de igual==.',
                subtext: '**Negrita** y *cursiva* van como en Obsidian.'
            },
            {
                headline: 'Usa auto layout como en Figma.',
                subtext: 'Alinea un grupo en una fila o columna.'
            },
            {
                headline: 'Comparte tus diapos con un enlace.',
                subtext: 'Publícalas en línea con una cuenta gratis.'
            },
            {
                headline: 'Iluminación 3D como en Blender.',
                subtext: 'Luces de punto, sol, foco y área con sombras.'
            },
            {
                headline: 'Versiona tus presentaciones con Git.',
                subtext: 'Son archivos de texto Markdown y JSON.'
            },
            {
                headline: 'Crea componentes como en Figma.',
                subtext: 'Edítalo una vez y cambian todas las instancias.'
            },
            {
                headline: 'Explora temas como en Obsidian.',
                subtext: 'Instala un tema gratis con un clic.'
            },
            {
                headline: 'Usa una carpeta sincronizada.',
                subtext: 'Funcionan Dropbox, iCloud Drive y OneDrive.'
            },
            {
                headline: '3D con física de cuerpos rígidos.',
                subtext: 'Deja caer, vuelca o apila objetos.'
            },
            {
                headline: 'Las notas del orador son Markdown.',
                subtext: 'Se guardan en el mismo archivo que las diapos.'
            },
            {
                headline: 'Combina formas como en Figma.',
                subtext: 'Une, resta, interseca o excluye.'
            },
            {
                headline: 'Pon código en tus diapositivas.',
                subtext: 'El código se resalta en 21 lenguajes.'
            },
            {
                headline: 'Gratis para uso personal y comercial.',
                subtext: 'Descárgalo para Mac o Windows.'
            }
        ]
    },
    fa: {
        heading: 'از Canva، Keynote یا PowerPoint استفاده می‌کنید؟',
        credit: 'ساختهٔ Johan Sanneblad',
        messages: [
            {
                headline: 'اسلایدهایتان را با Markdown بنویسید.',
                subtext: 'متن و تصاویر را به هر جا که می‌خواهید بکشید.'
            },
            {
                headline: 'جایگزینی رایگان برای PowerPoint.',
                subtext: 'اشتراک‌گذاری و همکاری هم رایگان است.'
            },
            {
                headline: 'هر ارائه یک پوشه روی رایانهٔ شماست.',
                subtext: 'برای ساختن اسلاید به حساب کاربری نیاز ندارید.'
            },
            {
                headline: 'مثل Apple Motion متحرک‌سازی کنید.',
                subtext: 'از کی‌فریم، مسیر و مورف استفاده کنید.'
            },
            {
                headline: 'مدل‌های سه‌بعدی را روی اسلایدها بگذارید.',
                subtext: 'یک فایل GLB یا glTF باز کنید یا با Meshy یکی بسازید.'
            },
            {
                headline: 'مثل Google Slides همکاری کنید.',
                subtext: 'نشانگر و نظرهای همه را می‌بینید.'
            },
            {
                headline: 'متن همهٔ اسلایدها را یکجا ببینید.',
                subtext: 'View > Outline را باز کنید و با Markdown ویرایش کنید.'
            },
            {
                headline: 'اشیا را مثل Figma هم‌تراز کنید.',
                subtext: 'بر اساس فاصله، اندازه و زاویه تراز می‌شوند.'
            },
            {
                headline: 'از ارائه‌تان ویدیوی 4K خروجی بگیرید.',
                subtext: 'برای متحرک‌سازی به After Effects نیاز ندارید.'
            },
            {
                headline: 'شخصیت‌های سه‌بعدی راه می‌روند و می‌دوند.',
                subtext: 'برای ریگ‌کردن و متحرک‌سازی از Meshy استفاده کنید.'
            },
            {
                headline: 'کلمه‌ها را با ==علامت مساوی== هایلایت کنید.',
                subtext: '**پررنگ** و *ایتالیک* درست مثل Obsidian کار می‌کنند.'
            },
            {
                headline: 'مثل Figma از چیدمان خودکار استفاده کنید.',
                subtext: 'یک گروه را در یک ردیف یا ستون بچینید.'
            },
            {
                headline: 'ارائه را با یک پیوند به اشتراک بگذارید.',
                subtext: 'با یک حساب رایگان آن را آنلاین منتشر کنید.'
            },
            {
                headline: 'نورپردازی سه‌بعدی مثل Blender.',
                subtext: 'نورهای نقطه‌ای، خورشیدی، نورافکن و سطحی با سایه.'
            },
            {
                headline: 'ارائه‌هایتان را با Git مدیریت کنید.',
                subtext: 'ارائه‌ها فایل‌های متنی Markdown و JSON هستند.'
            },
            {
                headline: 'مثل Figma کامپوننت بسازید.',
                subtext: 'یک بار ویرایش کنید تا همهٔ نمونه‌ها تغییر کنند.'
            },
            {
                headline: 'تم‌ها را مثل Obsidian مرور کنید.',
                subtext: 'یک تم رایگان را با یک کلیک نصب کنید.'
            },
            {
                headline: 'ارائه‌هایتان را در یک پوشهٔ همگام نگه دارید.',
                subtext: 'Dropbox، iCloud Drive و OneDrive همه کار می‌کنند.'
            },
            {
                headline: 'سه‌بعدی با فیزیک اجسام صلب.',
                subtext: 'اشیا را بیندازید، واژگون کنید یا روی هم بچینید.'
            },
            {
                headline: 'یادداشت‌های سخنران هم Markdown هستند.',
                subtext: 'در همان فایل اسلایدها ذخیره می‌شوند.'
            },
            {
                headline: 'شکل‌ها را مثل Figma ترکیب کنید.',
                subtext: 'ادغام، تفریق، اشتراک یا استثنا.'
            },
            {
                headline: 'کد را روی اسلایدها بگذارید.',
                subtext: 'بلوک‌های کد در ۲۱ زبان رنگ‌بندی نحوی دارند.'
            },
            {
                headline: 'رایگان برای استفادهٔ شخصی و تجاری.',
                subtext: 'نسخهٔ Mac یا Windows را دانلود کنید.'
            }
        ]
    },
    fr: {
        heading: 'Vous utilisez Canva, Keynote ou PowerPoint ?',
        credit: 'par Johan Sanneblad',
        messages: [
            {
                headline: 'Écrivez vos diapos en Markdown.',
                subtext: 'Glissez textes et images là où vous voulez.'
            },
            {
                headline: 'Une alternative gratuite à PowerPoint.',
                subtext: 'Partage et collaboration sont aussi gratuits.'
            },
            {
                headline: 'Vos diapos sont sur votre ordinateur.',
                subtext: 'Créez des diapos sans aucun compte.'
            },
            {
                headline: 'Animez comme avec Apple Motion.',
                subtext: 'Utilisez keyframes, tracés et morphs.'
            },
            {
                headline: 'Mettez des modèles 3D sur vos diapos.',
                subtext: 'Ouvrez un GLB ou glTF, ou utilisez Meshy.'
            },
            {
                headline: 'Collaborez comme sur Google Slides.',
                subtext: 'Voyez les curseurs et commentaires de chacun.'
            },
            {
                headline: 'Voyez tout le texte en un seul endroit.',
                subtext: 'Ouvrez View > Outline et modifiez en Markdown.'
            },
            {
                headline: 'Aimantez les objets comme dans Figma.',
                subtext: 'Alignez par espacement, taille et angle.'
            },
            {
                headline: 'Exportez vos diapos en vidéo 4K.',
                subtext: 'Pas besoin d’After Effects pour les animer.'
            },
            {
                headline: 'Faites marcher des personnages 3D.',
                subtext: 'Utilisez Meshy pour le rigging et l’animation.'
            },
            {
                headline: 'Surlignez avec des ==signes égal==.',
                subtext: '**Gras** et *italique* sont comme dans Obsidian.'
            },
            {
                headline: 'Utilisez l’auto layout comme dans Figma.',
                subtext: 'Alignez un groupe en ligne ou en colonne.'
            },
            {
                headline: 'Partagez une présentation par lien.',
                subtext: 'Publiez-la en ligne avec un compte gratuit.'
            },
            {
                headline: 'Éclairage 3D comme dans Blender.',
                subtext: 'Lampes point, soleil, spot et surface avec ombres.'
            },
            {
                headline: 'Versionnez vos présentations avec Git.',
                subtext: 'Ce sont des fichiers texte Markdown et JSON.'
            },
            {
                headline: 'Des composants comme dans Figma.',
                subtext: 'Modifiez-le une fois et chaque instance suit.'
            },
            {
                headline: 'Parcourez des thèmes à la Obsidian.',
                subtext: 'Installez un thème gratuit en un clic.'
            },
            {
                headline: 'Utilisez un dossier synchronisé.',
                subtext: 'Dropbox, iCloud Drive et OneDrive fonctionnent.'
            },
            {
                headline: 'La 3D avec la physique des solides.',
                subtext: 'Lâchez, basculez ou empilez des objets.'
            },
            {
                headline: 'Vos notes d’orateur sont en Markdown.',
                subtext: 'Elles sont dans le même fichier que les diapos.'
            },
            {
                headline: 'Combinez les formes comme Figma.',
                subtext: 'Union, soustraction, intersection ou exclusion.'
            },
            {
                headline: 'Mettez du code sur vos diapos.',
                subtext: 'Les blocs de code sont colorés en 21 langages.'
            },
            {
                headline: 'Gratuit pour un usage perso et pro.',
                subtext: 'Téléchargez-le pour Mac ou Windows.'
            }
        ]
    },
    id: {
        heading: 'Apakah Anda memakai Canva, Keynote, atau PowerPoint?',
        credit: 'oleh Johan Sanneblad',
        messages: [
            {
                headline: 'Tulis slide Anda dalam Markdown.',
                subtext: 'Seret teks dan gambar ke posisi yang Anda mau.'
            },
            {
                headline: 'Alternatif gratis untuk PowerPoint.',
                subtext: 'Berbagi dan berkolaborasi juga gratis.'
            },
            {
                headline: 'Presentasi tersimpan di komputer Anda.',
                subtext: 'Anda tidak perlu akun untuk membuat slide.'
            },
            {
                headline: 'Buat animasi ala Apple Motion.',
                subtext: 'Gunakan keyframe, jalur, dan morph.'
            },
            {
                headline: 'Taruh model 3D di slide Anda.',
                subtext: 'Buka file GLB atau glTF, atau buat dengan Meshy.'
            },
            {
                headline: 'Berkolaborasi ala Google Slides.',
                subtext: 'Lihat pointer dan komentar semua orang.'
            },
            {
                headline: 'Lihat teks semua slide di satu tempat.',
                subtext: 'Buka View > Outline dan edit sebagai Markdown.'
            },
            {
                headline: 'Snap objek ala Figma.',
                subtext: 'Rapikan berdasarkan jarak, ukuran, dan sudut.'
            },
            {
                headline: 'Ekspor presentasi sebagai video 4K.',
                subtext: 'Tidak perlu After Effects untuk animasinya.'
            },
            {
                headline: 'Buat karakter 3D berjalan atau berlari.',
                subtext: 'Gunakan Meshy untuk rigging dan animasi.'
            },
            {
                headline: 'Sorot dengan ==tanda sama dengan==.',
                subtext: '**Tebal** dan *miring* sama seperti di Obsidian.'
            },
            {
                headline: 'Gunakan auto layout ala Figma.',
                subtext: 'Susun grup dalam satu baris atau kolom.'
            },
            {
                headline: 'Bagikan presentasi dengan tautan.',
                subtext: 'Terbitkan online dengan akun gratis.'
            },
            {
                headline: 'Pencahayaan 3D ala Blender.',
                subtext: 'Cahaya titik, matahari, sorot, dan area berbayang.'
            },
            {
                headline: 'Lacak presentasi Anda di Git.',
                subtext: 'Presentasi berupa file teks Markdown dan JSON.'
            },
            {
                headline: 'Buat komponen ala Figma.',
                subtext: 'Edit sekali dan semua instance ikut berubah.'
            },
            {
                headline: 'Jelajahi tema seperti di Obsidian.',
                subtext: 'Pasang tema gratis dengan sekali klik.'
            },
            {
                headline: 'Simpan presentasi di folder tersinkron.',
                subtext: 'Bisa dengan Dropbox, iCloud Drive, atau OneDrive.'
            },
            {
                headline: '3D dengan fisika benda tegar.',
                subtext: 'Jatuhkan, robohkan, atau tumpuk objek.'
            },
            {
                headline: 'Catatan pembicara juga Markdown.',
                subtext: 'Tersimpan di file yang sama dengan slide.'
            },
            {
                headline: 'Gabungkan bentuk ala Figma.',
                subtext: 'Satukan, kurangi, iris, atau kecualikan.'
            },
            {
                headline: 'Tampilkan kode di slide Anda.',
                subtext: 'Blok kode disorot untuk 21 bahasa.'
            },
            {
                headline: 'Gratis untuk pribadi dan komersial.',
                subtext: 'Unduh untuk Mac atau Windows.'
            }
        ]
    },
    it: {
        heading: 'Usi Canva, Keynote o PowerPoint?',
        credit: 'di Johan Sanneblad',
        messages: [
            {
                headline: 'Scrivi le tue slide in Markdown.',
                subtext: 'Trascina testi e immagini dove vuoi.'
            },
            {
                headline: 'Un’alternativa gratuita a PowerPoint.',
                subtext: 'Anche condivisione e collaborazione sono gratis.'
            },
            {
                headline: 'Le tue slide sono cartelle sul computer.',
                subtext: 'Non ti serve un account per creare slide.'
            },
            {
                headline: 'Anima come in Apple Motion.',
                subtext: 'Usa keyframe, tracciati e morph.'
            },
            {
                headline: 'Metti modelli 3D nelle tue slide.',
                subtext: 'Apri un file GLB o glTF, o generane uno con Meshy.'
            },
            {
                headline: 'Collabora come su Google Slides.',
                subtext: 'Vedi i puntatori e i commenti di tutti.'
            },
            {
                headline: 'Vedi tutto il testo in un unico posto.',
                subtext: 'Apri View > Outline e modificalo in Markdown.'
            },
            {
                headline: 'Aggancia gli oggetti come in Figma.',
                subtext: 'Allinea per spaziatura, dimensione e angolo.'
            },
            {
                headline: 'Esporta la presentazione in video 4K.',
                subtext: 'Per animarla non ti serve After Effects.'
            },
            {
                headline: 'Fai camminare o correre personaggi 3D.',
                subtext: 'Usa Meshy per rigging e animazione.'
            },
            {
                headline: 'Evidenzia con i ==segni di uguale==.',
                subtext: '**Grassetto** e *corsivo* vanno come in Obsidian.'
            },
            {
                headline: 'Usa l’auto layout come in Figma.',
                subtext: 'Allinea un gruppo in una riga o colonna.'
            },
            {
                headline: 'Condividi le slide con un link.',
                subtext: 'Pubblicale online con un account gratuito.'
            },
            {
                headline: 'Illuminazione 3D come in Blender.',
                subtext: 'Luci puntiformi, solari, spot e ad area con ombre.'
            },
            {
                headline: 'Versiona le presentazioni con Git.',
                subtext: 'Sono file di testo Markdown e JSON.'
            },
            {
                headline: 'Crea componenti come in Figma.',
                subtext: 'Modificalo una volta e ogni istanza cambia.'
            },
            {
                headline: 'Sfoglia i temi come in Obsidian.',
                subtext: 'Installa un tema gratis con un clic.'
            },
            {
                headline: 'Usa una cartella sincronizzata.',
                subtext: 'Dropbox, iCloud Drive e OneDrive funzionano.'
            },
            {
                headline: '3D con fisica dei corpi rigidi.',
                subtext: 'Fai cadere, ribalta o impila oggetti.'
            },
            {
                headline: 'Le note del relatore sono in Markdown.',
                subtext: 'Stanno nello stesso file delle slide.'
            },
            {
                headline: 'Combina forme come in Figma.',
                subtext: 'Unisci, sottrai, interseca o escludi.'
            },
            {
                headline: 'Metti del codice nelle tue slide.',
                subtext: 'Il codice è evidenziato in 21 linguaggi.'
            },
            {
                headline: 'Gratis per uso personale e commerciale.',
                subtext: 'Scaricala per Mac o Windows.'
            }
        ]
    },
    ja: {
        heading: 'Canva、Keynote、PowerPoint を使っていますか？',
        credit: '作者：Johan Sanneblad',
        messages: [
            {
                headline: 'スライドは Markdown で書けます。',
                subtext: 'テキストや画像はドラッグで動かせます。'
            },
            {
                headline: 'PowerPoint に代わる無料アプリ。',
                subtext: '共有も共同編集も無料です。'
            },
            {
                headline: 'プレゼンはパソコン上のフォルダです。',
                subtext: 'スライド作成にアカウントは要りません。'
            },
            {
                headline: 'Apple Motion のように動かせます。',
                subtext: 'キーフレーム、パス、モーフを使えます。'
            },
            {
                headline: 'スライドに 3D モデルを置けます。',
                subtext: 'GLB や glTF を開くか、Meshy で生成します。'
            },
            {
                headline: 'Google Slides のように共同編集できます。',
                subtext: 'みんなのポインターとコメントが見えます。'
            },
            {
                headline: '全スライドのテキストを一覧できます。',
                subtext: 'View > Outline から Markdown で編集できます。'
            },
            {
                headline: 'Figma のようにスナップします。',
                subtext: '間隔、サイズ、角度で揃います。'
            },
            {
                headline: 'プレゼンを 4K 動画で書き出せます。',
                subtext: 'アニメーションに After Effects は要りません。'
            },
            {
                headline: '3D キャラクターが歩いて走ります。',
                subtext: 'リギングとアニメーションには Meshy を使います。'
            },
            {
                headline: '==等号== でハイライトできます。',
                subtext: '**太字** と *斜体* も Obsidian と同じです。'
            },
            {
                headline: 'Figma のようなオートレイアウト。',
                subtext: 'グループを横一列か縦一列に並べます。'
            },
            {
                headline: 'プレゼンをリンクで共有できます。',
                subtext: '無料アカウントでウェブに公開できます。'
            },
            {
                headline: 'Blender のような 3D ライティング。',
                subtext: 'ポイント、サン、スポット、エリアのライトと影。'
            },
            {
                headline: 'プレゼンを Git で管理できます。',
                subtext: 'Markdown と JSON のテキストファイルです。'
            },
            {
                headline: 'Figma のようにコンポーネントを作れます。',
                subtext: '一度編集すると、すべてのインスタンスが変わります。'
            },
            {
                headline: 'Obsidian のようにテーマを選べます。',
                subtext: '無料のテーマをワンクリックでインストールできます。'
            },
            {
                headline: 'プレゼンは同期フォルダに置けます。',
                subtext: 'Dropbox、iCloud Drive、OneDrive で使えます。'
            },
            {
                headline: '剛体物理演算つきの 3D。',
                subtext: 'オブジェクトを落とし、倒し、積み上げます。'
            },
            {
                headline: '発表者ノートも Markdown です。',
                subtext: 'スライドと同じファイルに保存されます。'
            },
            {
                headline: 'Figma のようにシェイプを結合できます。',
                subtext: '結合、型抜き、交差、中マドが使えます。'
            },
            {
                headline: 'スライドにコードを載せられます。',
                subtext: 'コードは21言語でハイライトされます。'
            },
            {
                headline: '個人でも商用でも無料です。',
                subtext: 'Mac 版か Windows 版をダウンロードできます。'
            }
        ]
    },
    ko: {
        heading: 'Canva, Keynote, PowerPoint를 쓰시나요?',
        credit: '제작: Johan Sanneblad',
        messages: [
            {
                headline: '슬라이드를 Markdown으로 쓰세요.',
                subtext: '텍스트와 이미지는 원하는 곳으로 드래그하세요.'
            },
            {
                headline: 'PowerPoint의 무료 대안입니다.',
                subtext: '공유와 공동 작업도 무료입니다.'
            },
            {
                headline: '발표 자료는 컴퓨터 속 폴더 하나입니다.',
                subtext: '슬라이드를 만드는 데 계정이 필요 없습니다.'
            },
            {
                headline: 'Apple Motion처럼 애니메이션을 만드세요.',
                subtext: '키프레임, 경로, 모핑을 사용할 수 있습니다.'
            },
            {
                headline: '슬라이드에 3D 모델을 넣으세요.',
                subtext: 'GLB나 glTF 파일을 열거나 Meshy로 생성하세요.'
            },
            {
                headline: 'Google Slides처럼 공동 작업하세요.',
                subtext: '모두의 포인터와 댓글이 보입니다.'
            },
            {
                headline: '모든 슬라이드의 글을 한곳에서 보세요.',
                subtext: 'View > Outline을 열고 Markdown으로 편집하세요.'
            },
            {
                headline: 'Figma처럼 개체를 스냅하세요.',
                subtext: '간격, 크기, 각도에 맞춰 정렬됩니다.'
            },
            {
                headline: '발표 자료를 4K 영상으로 내보내세요.',
                subtext: '애니메이션에 After Effects가 필요 없습니다.'
            },
            {
                headline: '3D 캐릭터를 걷거나 뛰게 하세요.',
                subtext: '리깅과 애니메이션에는 Meshy를 사용하세요.'
            },
            {
                headline: '==등호==로 감싸면 하이라이트됩니다.',
                subtext: '**굵게**와 *기울임*은 Obsidian과 똑같이 작동합니다.'
            },
            {
                headline: 'Figma처럼 자동 레이아웃을 쓰세요.',
                subtext: '그룹을 한 행이나 한 열로 정렬합니다.'
            },
            {
                headline: '링크로 발표 자료를 공유하세요.',
                subtext: '무료 계정으로 웹에 게시할 수 있습니다.'
            },
            {
                headline: 'Blender 같은 3D 조명.',
                subtext: '포인트, 태양, 스폿, 영역 조명과 그림자.'
            },
            {
                headline: '발표 자료를 Git으로 관리하세요.',
                subtext: '발표 자료는 Markdown과 JSON 텍스트 파일입니다.'
            },
            {
                headline: 'Figma처럼 컴포넌트를 만드세요.',
                subtext: '한 번 편집하면 모든 인스턴스가 바뀝니다.'
            },
            {
                headline: 'Obsidian처럼 테마를 둘러보세요.',
                subtext: '무료 테마를 클릭 한 번으로 설치하세요.'
            },
            {
                headline: '발표 자료를 동기화 폴더에 두세요.',
                subtext: 'Dropbox, iCloud Drive, OneDrive 모두 됩니다.'
            },
            {
                headline: '강체 물리가 있는 3D.',
                subtext: '개체를 떨어뜨리고, 넘어뜨리고, 쌓으세요.'
            },
            {
                headline: '발표자 노트도 Markdown입니다.',
                subtext: '슬라이드와 같은 파일에 저장됩니다.'
            },
            {
                headline: 'Figma처럼 도형을 결합하세요.',
                subtext: '합집합, 빼기, 교집합, 제외를 쓸 수 있습니다.'
            },
            {
                headline: '슬라이드에 코드를 넣으세요.',
                subtext: '코드 블록은 21개 언어의 구문 강조를 지원합니다.'
            },
            {
                headline: '개인용과 상업용 모두 무료입니다.',
                subtext: 'Mac 또는 Windows용으로 내려받으세요.'
            }
        ]
    },
    nl: {
        heading: 'Gebruik je Canva, Keynote of PowerPoint?',
        credit: 'door Johan Sanneblad',
        messages: [
            {
                headline: 'Schrijf je slides in Markdown.',
                subtext: 'Sleep tekst en afbeeldingen waar je ze wilt.'
            },
            {
                headline: 'Een gratis alternatief voor PowerPoint.',
                subtext: 'Delen en samenwerken zijn ook gratis.'
            },
            {
                headline: 'Je slides zijn mappen op je computer.',
                subtext: 'Je hebt geen account nodig voor slides.'
            },
            {
                headline: 'Animeer zoals in Apple Motion.',
                subtext: 'Gebruik keyframes, paden en morphs.'
            },
            {
                headline: 'Zet 3D-modellen op je slides.',
                subtext: 'Open een GLB- of glTF-bestand of gebruik Meshy.'
            },
            {
                headline: 'Werk samen zoals in Google Slides.',
                subtext: 'Zie ieders cursor en reacties.'
            },
            {
                headline: 'Zie alle slidetekst op één plek.',
                subtext: 'Open View > Outline en bewerk in Markdown.'
            },
            {
                headline: 'Snap objecten zoals in Figma.',
                subtext: 'Lijn uit op afstand, grootte en hoek.'
            },
            {
                headline: 'Exporteer je presentatie als 4K-video.',
                subtext: 'Je hebt geen After Effects nodig om te animeren.'
            },
            {
                headline: 'Laat 3D-personages lopen of rennen.',
                subtext: 'Gebruik Meshy voor rigging en animatie.'
            },
            {
                headline: 'Markeer met ==isgelijktekens==.',
                subtext: '**Vet** en *cursief* werken zoals in Obsidian.'
            },
            {
                headline: 'Gebruik auto layout zoals in Figma.',
                subtext: 'Zet een groep in een rij of een kolom.'
            },
            {
                headline: 'Deel een presentatie met een link.',
                subtext: 'Zet hem online met een gratis account.'
            },
            {
                headline: '3D-belichting zoals in Blender.',
                subtext: 'Punt-, zon-, spot- en vlaklampen met schaduwen.'
            },
            {
                headline: 'Beheer je presentaties in Git.',
                subtext: 'Het zijn Markdown- en JSON-tekstbestanden.'
            },
            {
                headline: 'Bouw componenten zoals in Figma.',
                subtext: 'Bewerk ze één keer en elke instantie verandert.'
            },
            {
                headline: 'Blader door thema’s zoals in Obsidian.',
                subtext: 'Installeer een gratis thema met één klik.'
            },
            {
                headline: 'Gebruik een gesynchroniseerde map.',
                subtext: 'Dropbox, iCloud Drive en OneDrive werken.'
            },
            {
                headline: '3D met starre-lichamenfysica.',
                subtext: 'Laat objecten vallen, kantelen en opstapelen.'
            },
            {
                headline: 'Sprekersnotities zijn ook Markdown.',
                subtext: 'Ze staan in hetzelfde bestand als de slides.'
            },
            {
                headline: 'Combineer vormen zoals in Figma.',
                subtext: 'Verenigen, aftrekken, snijden of uitsluiten.'
            },
            {
                headline: 'Zet code op je slides.',
                subtext: 'Code krijgt syntaxiskleuring in 21 talen.'
            },
            {
                headline: 'Gratis voor privé en zakelijk gebruik.',
                subtext: 'Download het voor Mac of Windows.'
            }
        ]
    },
    pl: {
        heading: 'Korzystasz z Canva, Keynote albo PowerPoint?',
        credit: 'od Johana Sanneblada',
        messages: [
            {
                headline: 'Pisz slajdy w Markdown.',
                subtext: 'Przeciągaj tekst i obrazy tam, gdzie chcesz.'
            },
            {
                headline: 'Darmowa alternatywa dla PowerPoint.',
                subtext: 'Udostępnianie i współpraca też są darmowe.'
            },
            {
                headline: 'Prezentacja to folder na komputerze.',
                subtext: 'Do tworzenia slajdów nie potrzebujesz konta.'
            },
            {
                headline: 'Animuj jak w Apple Motion.',
                subtext: 'Używaj klatek kluczowych, ścieżek i morfingu.'
            },
            {
                headline: 'Umieść modele 3D na slajdach.',
                subtext: 'Otwórz plik GLB lub glTF albo użyj Meshy.'
            },
            {
                headline: 'Współpracuj jak w Google Slides.',
                subtext: 'Widzisz kursory i komentarze wszystkich.'
            },
            {
                headline: 'Cały tekst slajdów w jednym miejscu.',
                subtext: 'Otwórz View > Outline i edytuj w Markdown.'
            },
            {
                headline: 'Przyciągaj obiekty jak w Figma.',
                subtext: 'Wyrównuj według odstępów, rozmiaru i kąta.'
            },
            {
                headline: 'Eksportuj prezentację jako wideo 4K.',
                subtext: 'Do animacji nie potrzebujesz After Effects.'
            },
            {
                headline: 'Postacie 3D chodzą i biegają.',
                subtext: 'Użyj Meshy do riggingu i animacji.'
            },
            {
                headline: 'Wyróżniaj słowa ==znakami równości==.',
                subtext: '**Pogrubienie** i *kursywa* są jak w Obsidian.'
            },
            {
                headline: 'Używaj auto layoutu jak w Figma.',
                subtext: 'Ułóż grupę w rzędzie lub kolumnie.'
            },
            {
                headline: 'Udostępnij prezentację linkiem.',
                subtext: 'Opublikuj ją online z darmowym kontem.'
            },
            {
                headline: 'Oświetlenie 3D jak w Blender.',
                subtext: 'Punkt, słońce, reflektor i obszar z cieniami.'
            },
            {
                headline: 'Śledź zmiany prezentacji w Git.',
                subtext: 'Prezentacje to pliki tekstowe Markdown i JSON.'
            },
            {
                headline: 'Twórz komponenty jak w Figma.',
                subtext: 'Edytuj raz, a zmieni się każda instancja.'
            },
            {
                headline: 'Przeglądaj motywy jak w Obsidian.',
                subtext: 'Zainstaluj darmowy motyw jednym kliknięciem.'
            },
            {
                headline: 'Trzymaj prezentacje w chmurze.',
                subtext: 'Działa z Dropbox, iCloud Drive i OneDrive.'
            },
            {
                headline: '3D z fizyką brył sztywnych.',
                subtext: 'Upuszczaj, przewracaj i układaj obiekty.'
            },
            {
                headline: 'Notatki prelegenta to też Markdown.',
                subtext: 'Są zapisane w tym samym pliku co slajdy.'
            },
            {
                headline: 'Łącz kształty jak w Figma.',
                subtext: 'Suma, różnica, część wspólna lub wykluczenie.'
            },
            {
                headline: 'Umieść kod na slajdach.',
                subtext: 'Bloki kodu są podświetlane w 21 językach.'
            },
            {
                headline: 'Darmowy w domu i w pracy.',
                subtext: 'Pobierz na Mac lub Windows.'
            }
        ]
    },
    pt: {
        heading: 'Usa o Canva, o Keynote ou o PowerPoint?',
        credit: 'por Johan Sanneblad',
        messages: [
            {
                headline: 'Escreva diapositivos em Markdown.',
                subtext: 'Arraste texto e imagens para onde quiser.'
            },
            {
                headline: 'Uma alternativa gratuita ao PowerPoint.',
                subtext: 'A partilha e a colaboração também são gratuitas.'
            },
            {
                headline: 'Tudo fica guardado no seu computador.',
                subtext: 'Não precisa de conta para criar diapositivos.'
            },
            {
                headline: 'Anime como no Apple Motion.',
                subtext: 'Use keyframes, trajetórias e morphs.'
            },
            {
                headline: 'Ponha modelos 3D nos diapositivos.',
                subtext: 'Abra um GLB ou glTF, ou gere um com o Meshy.'
            },
            {
                headline: 'Colabore como no Google Slides.',
                subtext: 'Veja os ponteiros e comentários de todos.'
            },
            {
                headline: 'Veja todo o texto num só sítio.',
                subtext: 'Abra View > Outline e edite em Markdown.'
            },
            {
                headline: 'Encaixe objetos como no Figma.',
                subtext: 'Alinhe por espaçamento, tamanho e ângulo.'
            },
            {
                headline: 'Exporte a apresentação em vídeo 4K.',
                subtext: 'Não precisa do After Effects para a animar.'
            },
            {
                headline: 'Personagens 3D que andam e correm.',
                subtext: 'Use o Meshy para rigging e animação.'
            },
            {
                headline: 'Realce com ==sinais de igual==.',
                subtext: '**Negrito** e *itálico* são como no Obsidian.'
            },
            {
                headline: 'Use auto layout como no Figma.',
                subtext: 'Alinhe um grupo numa linha ou coluna.'
            },
            {
                headline: 'Partilhe com uma ligação.',
                subtext: 'Publique-a online com uma conta gratuita.'
            },
            {
                headline: 'Iluminação 3D como no Blender.',
                subtext: 'Luzes ponto, sol, foco e área com sombras.'
            },
            {
                headline: 'Controle versões no Git.',
                subtext: 'São ficheiros de texto Markdown e JSON.'
            },
            {
                headline: 'Crie componentes como no Figma.',
                subtext: 'Edite uma vez e todas as instâncias mudam.'
            },
            {
                headline: 'Explore temas como no Obsidian.',
                subtext: 'Instale um tema gratuito com um clique.'
            },
            {
                headline: 'Guarde tudo numa pasta sincronizada.',
                subtext: 'Funciona com Dropbox, iCloud Drive e OneDrive.'
            },
            {
                headline: '3D com física de corpos rígidos.',
                subtext: 'Deixe cair, tombe ou empilhe objetos.'
            },
            {
                headline: 'As notas do orador são Markdown.',
                subtext: 'Ficam no mesmo ficheiro que os diapositivos.'
            },
            {
                headline: 'Combine formas como no Figma.',
                subtext: 'Una, subtraia, intersete ou exclua.'
            },
            {
                headline: 'Ponha código nos seus diapositivos.',
                subtext: 'O código é realçado em 21 linguagens.'
            },
            {
                headline: 'Gratuito para uso pessoal e comercial.',
                subtext: 'Descarregue-o para Mac ou Windows.'
            }
        ]
    },
    'pt-BR': {
        heading: 'Você usa Canva, Keynote ou PowerPoint?',
        credit: 'por Johan Sanneblad',
        messages: [
            {
                headline: 'Escreva seus slides em Markdown.',
                subtext: 'Arraste textos e imagens para onde quiser.'
            },
            {
                headline: 'Uma alternativa gratuita ao PowerPoint.',
                subtext: 'Compartilhar e colaborar também é grátis.'
            },
            {
                headline: 'Tudo fica salvo no seu computador.',
                subtext: 'Você não precisa de conta para criar slides.'
            },
            {
                headline: 'Anime como no Apple Motion.',
                subtext: 'Use keyframes, caminhos e morphs.'
            },
            {
                headline: 'Coloque modelos 3D nos seus slides.',
                subtext: 'Abra um GLB ou glTF, ou gere um com o Meshy.'
            },
            {
                headline: 'Colabore como no Google Slides.',
                subtext: 'Veja os cursores e comentários de todos.'
            },
            {
                headline: 'Veja todo o texto em um só lugar.',
                subtext: 'Abra View > Outline e edite em Markdown.'
            },
            {
                headline: 'Encaixe objetos como no Figma.',
                subtext: 'Alinhe por espaçamento, tamanho e ângulo.'
            },
            {
                headline: 'Exporte seus slides em vídeo 4K.',
                subtext: 'Você não precisa do After Effects para animar.'
            },
            {
                headline: 'Personagens 3D que andam e correm.',
                subtext: 'Use o Meshy para rigging e animação.'
            },
            {
                headline: 'Destaque com ==sinais de igual==.',
                subtext: '**Negrito** e *itálico* são iguais ao Obsidian.'
            },
            {
                headline: 'Use auto layout como no Figma.',
                subtext: 'Alinhe um grupo em uma linha ou coluna.'
            },
            {
                headline: 'Compartilhe com um link.',
                subtext: 'Publique online com uma conta gratuita.'
            },
            {
                headline: 'Iluminação 3D como no Blender.',
                subtext: 'Luzes ponto, sol, spot e área com sombras.'
            },
            {
                headline: 'Versione suas apresentações no Git.',
                subtext: 'São arquivos de texto Markdown e JSON.'
            },
            {
                headline: 'Crie componentes como no Figma.',
                subtext: 'Edite uma vez e todas as instâncias mudam.'
            },
            {
                headline: 'Explore temas como no Obsidian.',
                subtext: 'Instale um tema grátis com um clique.'
            },
            {
                headline: 'Salve em uma pasta sincronizada.',
                subtext: 'Funciona com Dropbox, iCloud Drive e OneDrive.'
            },
            {
                headline: '3D com física de corpos rígidos.',
                subtext: 'Derrube, tombe ou empilhe objetos.'
            },
            {
                headline: 'Notas do apresentador são Markdown.',
                subtext: 'Elas ficam salvas no mesmo arquivo dos slides.'
            },
            {
                headline: 'Combine formas como no Figma.',
                subtext: 'Una, subtraia, intersecte ou exclua.'
            },
            {
                headline: 'Coloque código nos seus slides.',
                subtext: 'O código é destacado em 21 linguagens.'
            },
            {
                headline: 'Grátis para uso pessoal e comercial.',
                subtext: 'Baixe para Mac ou Windows.'
            }
        ]
    },
    ru: {
        heading: 'Пользуетесь Canva, Keynote или PowerPoint?',
        credit: 'от Johan Sanneblad',
        messages: [
            {
                headline: 'Пишите слайды в Markdown.',
                subtext: 'Перетаскивайте текст и картинки куда нужно.'
            },
            {
                headline: 'Бесплатная альтернатива PowerPoint.',
                subtext: 'Общий доступ и совместная работа бесплатны.'
            },
            {
                headline: 'Всё хранится на вашем компьютере.',
                subtext: 'Для работы со слайдами аккаунт не нужен.'
            },
            {
                headline: 'Анимируйте как в Apple Motion.',
                subtext: 'Есть ключевые кадры, траектории и морфинг.'
            },
            {
                headline: 'Добавляйте 3D-модели на слайды.',
                subtext: 'Откройте GLB или glTF или создайте в Meshy.'
            },
            {
                headline: 'Работайте вместе как в Google Slides.',
                subtext: 'Видны курсоры и комментарии всех.'
            },
            {
                headline: 'Весь текст слайдов в одном месте.',
                subtext: 'Откройте View > Outline и правьте Markdown.'
            },
            {
                headline: 'Привязывайте объекты как в Figma.',
                subtext: 'Выравнивайте по отступам, размеру и углу.'
            },
            {
                headline: 'Экспортируйте слайды в видео 4K.',
                subtext: 'After Effects для анимации не нужен.'
            },
            {
                headline: 'Пусть 3D-персонажи ходят и бегают.',
                subtext: 'Используйте Meshy для риггинга и анимации.'
            },
            {
                headline: 'Выделяйте ==знаками равенства==.',
                subtext: '**Жирный** и *курсив* работают как в Obsidian.'
            },
            {
                headline: 'Используйте автолейаут как в Figma.',
                subtext: 'Выстраивайте группу в строку или столбец.'
            },
            {
                headline: 'Делитесь презентацией по ссылке.',
                subtext: 'Публикуйте её онлайн с бесплатным аккаунтом.'
            },
            {
                headline: '3D-освещение как в Blender.',
                subtext: 'Точка, солнце, прожектор и область с тенями.'
            },
            {
                headline: 'Храните версии слайдов в Git.',
                subtext: 'Это текстовые файлы Markdown и JSON.'
            },
            {
                headline: 'Создавайте компоненты как в Figma.',
                subtext: 'Измените раз, и изменятся все экземпляры.'
            },
            {
                headline: 'Выбирайте темы как в Obsidian.',
                subtext: 'Установите бесплатную тему в один клик.'
            },
            {
                headline: 'Держите слайды в облачной папке.',
                subtext: 'Работает с Dropbox, iCloud Drive и OneDrive.'
            },
            {
                headline: '3D с физикой твёрдых тел.',
                subtext: 'Роняйте, опрокидывайте и ставьте в стопку.'
            },
            {
                headline: 'Заметки докладчика в Markdown.',
                subtext: 'Они хранятся в том же файле, что и слайды.'
            },
            {
                headline: 'Комбинируйте фигуры как в Figma.',
                subtext: 'Объедините, вычтите, пересеките, исключите.'
            },
            {
                headline: 'Добавляйте код на слайды.',
                subtext: 'Блоки кода подсвечиваются для 21 языка.'
            },
            {
                headline: 'Бесплатно для дома и работы.',
                subtext: 'Скачайте для Mac или Windows.'
            }
        ]
    },
    th: {
        heading: 'ใช้ Canva, Keynote หรือ PowerPoint อยู่หรือเปล่า',
        credit: 'โดย Johan Sanneblad',
        messages: [
            {
                headline: 'เขียนสไลด์ของคุณด้วย Markdown',
                subtext: 'ลากข้อความและรูปภาพไปวางตรงที่คุณต้องการ'
            },
            {
                headline: 'ทางเลือกฟรีแทน PowerPoint',
                subtext: 'การแชร์และการทำงานร่วมกันก็ฟรีด้วย'
            },
            {
                headline: 'งานนำเสนอคือโฟลเดอร์ในเครื่องของคุณ',
                subtext: 'คุณไม่ต้องมีบัญชีเพื่อสร้างสไลด์'
            },
            {
                headline: 'ทำแอนิเมชันได้แบบ Apple Motion',
                subtext: 'ใช้คีย์เฟรม พาธ และมอร์ฟ'
            },
            {
                headline: 'ใส่โมเดล 3D ลงในสไลด์ของคุณ',
                subtext: 'เปิดไฟล์ GLB หรือ glTF หรือสร้างด้วย Meshy'
            },
            {
                headline: 'ทำงานร่วมกันแบบ Google Slides',
                subtext: 'เห็นตัวชี้และความคิดเห็นของทุกคน'
            },
            {
                headline: 'ดูข้อความของทุกสไลด์ในที่เดียว',
                subtext: 'เปิด View > Outline แล้วแก้ไขเป็น Markdown'
            },
            {
                headline: 'สแนปวัตถุแบบ Figma',
                subtext: 'จัดแนวตามระยะห่าง ขนาด และมุม'
            },
            {
                headline: 'ส่งออกงานนำเสนอเป็นวิดีโอ 4K',
                subtext: 'คุณไม่ต้องใช้ After Effects เพื่อทำแอนิเมชัน'
            },
            {
                headline: 'ทำให้ตัวละคร 3D เดินหรือวิ่งได้',
                subtext: 'ใช้ Meshy ทำริกและแอนิเมชัน'
            },
            {
                headline: 'ไฮไลต์คำด้วย ==เครื่องหมายเท่ากับ==',
                subtext: '**ตัวหนา** และ *ตัวเอียง* ใช้ได้เหมือนใน Obsidian'
            },
            {
                headline: 'ใช้ Auto layout แบบ Figma',
                subtext: 'เรียงกลุ่มเป็นแถวหรือคอลัมน์'
            },
            {
                headline: 'แชร์งานนำเสนอด้วยลิงก์',
                subtext: 'เผยแพร่ออนไลน์ด้วยบัญชีฟรี'
            },
            {
                headline: 'แสงไฟ 3D แบบ Blender',
                subtext: 'ไฟแบบจุด ดวงอาทิตย์ สปอต และพื้นที่ พร้อมเงา'
            },
            {
                headline: 'ติดตามงานนำเสนอของคุณใน Git',
                subtext: 'งานนำเสนอเป็นไฟล์ข้อความ Markdown และ JSON'
            },
            {
                headline: 'สร้างคอมโพเนนต์แบบ Figma',
                subtext: 'แก้ครั้งเดียว ทุกอินสแตนซ์เปลี่ยนตาม'
            },
            {
                headline: 'เลือกธีมได้เหมือนใน Obsidian',
                subtext: 'ติดตั้งธีมฟรีได้ในคลิกเดียว'
            },
            {
                headline: 'เก็บงานนำเสนอไว้ในโฟลเดอร์ที่ซิงค์',
                subtext: 'ใช้ได้ทั้ง Dropbox, iCloud Drive และ OneDrive'
            },
            {
                headline: '3D พร้อมฟิสิกส์วัตถุแข็งเกร็ง',
                subtext: 'ทำให้วัตถุตก ล้ม หรือกองทับกัน'
            },
            {
                headline: 'โน้ตผู้บรรยายก็เป็น Markdown เหมือนกัน',
                subtext: 'บันทึกไว้ในไฟล์เดียวกับสไลด์'
            },
            {
                headline: 'รวมรูปทรงแบบ Figma',
                subtext: 'รวม ลบ ตัดกัน หรือยกเว้น'
            },
            {
                headline: 'ใส่โค้ดลงในสไลด์ของคุณ',
                subtext: 'บล็อกโค้ดไฮไลต์ไวยากรณ์ได้ 21 ภาษา'
            },
            {
                headline: 'ฟรีทั้งใช้ส่วนตัวและเชิงพาณิชย์',
                subtext: 'ดาวน์โหลดสำหรับ Mac หรือ Windows'
            }
        ]
    },
    tr: {
        heading: 'Canva, Keynote veya PowerPoint mi kullanıyorsunuz?',
        credit: "Johan Sanneblad'dan",
        messages: [
            {
                headline: 'Slaytlarınızı Markdown ile yazın.',
                subtext: 'Metinleri ve görselleri istediğiniz yere sürükleyin.'
            },
            {
                headline: "PowerPoint'e ücretsiz bir alternatif.",
                subtext: 'Paylaşım ve iş birliği de ücretsiz.'
            },
            {
                headline: 'Her sunum bilgisayarınızda bir klasördür.',
                subtext: 'Slayt hazırlamak için hesap gerekmez.'
            },
            {
                headline: 'Apple Motion gibi canlandırın.',
                subtext: 'Anahtar kareler, yollar ve dönüşümler kullanın.'
            },
            {
                headline: 'Slaytlarınıza 3D modeller koyun.',
                subtext: 'GLB veya glTF dosyası açın ya da Meshy kullanın.'
            },
            {
                headline: 'Google Slides gibi birlikte çalışın.',
                subtext: 'Herkesin işaretçisini ve yorumlarını görün.'
            },
            {
                headline: 'Tüm slaytların metnini tek yerde görün.',
                subtext: "View > Outline'ı açıp Markdown olarak düzenleyin."
            },
            {
                headline: 'Nesneleri Figma gibi hizalayın.',
                subtext: 'Aralık, boyut ve açıya göre yerine otururlar.'
            },
            {
                headline: 'Sunumu 4K video olarak dışa aktarın.',
                subtext: "Canlandırmak için After Effects'e ihtiyacınız yok."
            },
            {
                headline: '3D karakterleri yürütün veya koşturun.',
                subtext: 'Rig ve animasyon için Meshy kullanın.'
            },
            {
                headline: '==Eşittir işaretleriyle== vurgulayın.',
                subtext: "**Kalın** ve *italik* Obsidian'daki gibi çalışır."
            },
            {
                headline: 'Figma gibi otomatik yerleşim kullanın.',
                subtext: 'Bir grubu satır veya sütun hâlinde dizin.'
            },
            {
                headline: 'Sunumunuzu bir bağlantıyla paylaşın.',
                subtext: "Ücretsiz bir hesapla web'de yayınlayın."
            },
            {
                headline: 'Blender gibi 3D ışıklandırma.',
                subtext: 'Gölgeli nokta, güneş, spot ve alan ışıkları.'
            },
            {
                headline: "Sunumlarınızı Git'te takip edin.",
                subtext: 'Sunumlar Markdown ve JSON metin dosyalarıdır.'
            },
            {
                headline: 'Figma gibi bileşenler oluşturun.',
                subtext: 'Bir kez düzenleyin, tüm örnekler değişsin.'
            },
            {
                headline: 'Temalara Obsidian’daki gibi göz atın.',
                subtext: 'Ücretsiz bir temayı tek tıkla kurun.'
            },
            {
                headline: 'Sunumlarınızı eşitlenen klasörde tutun.',
                subtext: 'Dropbox, iCloud Drive ve OneDrive ile çalışır.'
            },
            {
                headline: 'Katı cisim fiziğiyle 3D.',
                subtext: 'Nesneleri düşürün, devirin veya yığın.'
            },
            {
                headline: 'Konuşmacı notları da Markdown.',
                subtext: 'Slaytlarla aynı dosyada kaydedilir.'
            },
            {
                headline: 'Şekilleri Figma gibi birleştirin.',
                subtext: 'Birleşim, çıkarma, kesişim veya hariç tutma.'
            },
            {
                headline: 'Slaytlarınıza kod ekleyin.',
                subtext: 'Kod blokları 21 dil için renklendirilir.'
            },
            {
                headline: 'Kişisel ve ticari kullanım için ücretsiz.',
                subtext: 'Mac veya Windows için indirin.'
            }
        ]
    },
    uk: {
        heading: 'Користуєтеся Canva, Keynote чи PowerPoint?',
        credit: 'від Johan Sanneblad',
        messages: [
            {
                headline: 'Пишіть слайди в Markdown.',
                subtext: 'Перетягуйте текст і зображення куди потрібно.'
            },
            {
                headline: 'Безкоштовна заміна PowerPoint.',
                subtext: 'Спільний доступ і співпраця теж безкоштовні.'
            },
            {
                headline: 'Усе зберігається на комп’ютері.',
                subtext: 'Для роботи зі слайдами акаунт не потрібен.'
            },
            {
                headline: 'Анімуйте як у Apple Motion.',
                subtext: 'Є ключові кадри, траєкторії й морфінг.'
            },
            {
                headline: 'Додавайте 3D-моделі на слайди.',
                subtext: 'Відкрийте GLB або glTF чи створіть у Meshy.'
            },
            {
                headline: 'Співпрацюйте як у Google Slides.',
                subtext: 'Видно курсори й коментарі всіх учасників.'
            },
            {
                headline: 'Увесь текст слайдів в одному місці.',
                subtext: 'Відкрийте View > Outline і редагуйте Markdown.'
            },
            {
                headline: 'Прив’язуйте об’єкти як у Figma.',
                subtext: 'Вирівнюйте за відступами, розміром і кутом.'
            },
            {
                headline: 'Експортуйте презентацію у відео 4K.',
                subtext: 'After Effects для анімації не потрібен.'
            },
            {
                headline: 'Нехай 3D-персонажі ходять і бігають.',
                subtext: 'Використовуйте Meshy для ригінгу й анімації.'
            },
            {
                headline: 'Виділяйте ==знаками рівності==.',
                subtext: '**Жирний** і *курсив* працюють як в Obsidian.'
            },
            {
                headline: 'Автолейаут як у Figma.',
                subtext: 'Вишиковуйте групу в рядок або стовпець.'
            },
            {
                headline: 'Діліться презентацією за посиланням.',
                subtext: 'Публікуйте її онлайн з безкоштовним акаунтом.'
            },
            {
                headline: '3D-освітлення як у Blender.',
                subtext: 'Точка, сонце, прожектор і область з тінями.'
            },
            {
                headline: 'Відстежуйте зміни презентацій у Git.',
                subtext: 'Це текстові файли Markdown і JSON.'
            },
            {
                headline: 'Створюйте компоненти як у Figma.',
                subtext: 'Змініть раз, і зміняться всі екземпляри.'
            },
            {
                headline: 'Обирайте теми як в Obsidian.',
                subtext: 'Встановіть безкоштовну тему одним кліком.'
            },
            {
                headline: 'Тримайте слайди в хмарній теці.',
                subtext: 'Працює з Dropbox, iCloud Drive і OneDrive.'
            },
            {
                headline: '3D з фізикою твердих тіл.',
                subtext: 'Кидайте, перекидайте й складайте об’єкти.'
            },
            {
                headline: 'Нотатки доповідача теж у Markdown.',
                subtext: 'Вони зберігаються в тому ж файлі, що й слайди.'
            },
            {
                headline: 'Комбінуйте фігури як у Figma.',
                subtext: 'Об’єднання, віднімання, перетин, виключення.'
            },
            {
                headline: 'Додавайте код на слайди.',
                subtext: 'Блоки коду підсвічуються для 21 мови.'
            },
            {
                headline: 'Безкоштовно для дому й роботи.',
                subtext: 'Завантажте для Mac або Windows.'
            }
        ]
    },
    vi: {
        heading: 'Bạn đang dùng Canva, Keynote hay PowerPoint?',
        credit: 'bởi Johan Sanneblad',
        messages: [
            {
                headline: 'Viết slide của bạn bằng Markdown.',
                subtext: 'Kéo chữ và hình ảnh đến nơi bạn muốn.'
            },
            {
                headline: 'Lựa chọn miễn phí thay cho PowerPoint.',
                subtext: 'Chia sẻ và cộng tác cũng miễn phí.'
            },
            {
                headline: 'Bộ slide là một thư mục trên máy tính.',
                subtext: 'Bạn không cần tài khoản để làm slide.'
            },
            {
                headline: 'Tạo chuyển động như Apple Motion.',
                subtext: 'Dùng keyframe, path và morph.'
            },
            {
                headline: 'Đưa mô hình 3D lên slide của bạn.',
                subtext: 'Mở tệp GLB hoặc glTF, hoặc tạo bằng Meshy.'
            },
            {
                headline: 'Cộng tác như Google Slides.',
                subtext: 'Thấy con trỏ và bình luận của mọi người.'
            },
            {
                headline: 'Xem chữ của mọi slide ở một chỗ.',
                subtext: 'Mở View > Outline và sửa bằng Markdown.'
            },
            {
                headline: 'Bắt dính đối tượng như Figma.',
                subtext: 'Căn theo khoảng cách, kích thước và góc.'
            },
            {
                headline: 'Xuất bộ slide thành video 4K.',
                subtext: 'Bạn không cần After Effects để tạo chuyển động.'
            },
            {
                headline: 'Cho nhân vật 3D đi hoặc chạy.',
                subtext: 'Dùng Meshy để rigging và tạo chuyển động.'
            },
            {
                headline: 'Tô sáng chữ bằng ==dấu bằng==.',
                subtext: '**Đậm** và *nghiêng* dùng y như trong Obsidian.'
            },
            {
                headline: 'Dùng auto layout như Figma.',
                subtext: 'Xếp một nhóm thành hàng hoặc cột.'
            },
            {
                headline: 'Chia sẻ bộ slide bằng một liên kết.',
                subtext: 'Đăng lên mạng với tài khoản miễn phí.'
            },
            {
                headline: 'Ánh sáng 3D như Blender.',
                subtext: 'Đèn điểm, mặt trời, spot và vùng có đổ bóng.'
            },
            {
                headline: 'Theo dõi bộ slide trong Git.',
                subtext: 'Bộ slide là các tệp văn bản Markdown và JSON.'
            },
            {
                headline: 'Tạo component như Figma.',
                subtext: 'Sửa một lần, mọi instance đều đổi theo.'
            },
            {
                headline: 'Duyệt chủ đề như trong Obsidian.',
                subtext: 'Cài một chủ đề miễn phí chỉ bằng một cú nhấp.'
            },
            {
                headline: 'Lưu bộ slide trong thư mục đồng bộ.',
                subtext: 'Dùng được với Dropbox, iCloud Drive và OneDrive.'
            },
            {
                headline: '3D với vật lý vật rắn.',
                subtext: 'Thả, lật hoặc chồng các vật thể.'
            },
            {
                headline: 'Ghi chú diễn giả cũng là Markdown.',
                subtext: 'Chúng được lưu chung tệp với các slide.'
            },
            {
                headline: 'Kết hợp hình như Figma.',
                subtext: 'Hợp, trừ, giao hoặc loại trừ.'
            },
            {
                headline: 'Đưa code lên slide của bạn.',
                subtext: 'Khối code được tô màu cú pháp cho 21 ngôn ngữ.'
            },
            {
                headline: 'Miễn phí cho cá nhân và thương mại.',
                subtext: 'Tải về cho Mac hoặc Windows.'
            }
        ]
    },
    zh: {
        heading: '您在用 Canva、Keynote 或 PowerPoint 吗？',
        credit: '作者：Johan Sanneblad',
        messages: [
            {
                headline: '用 Markdown 写幻灯片。',
                subtext: '把文字和图片拖到你想要的位置。'
            },
            {
                headline: 'PowerPoint 的免费替代品。',
                subtext: '分享和协作也都免费。'
            },
            {
                headline: '每份演示文稿都是电脑上的一个文件夹。',
                subtext: '做幻灯片不需要账号。'
            },
            {
                headline: '像 Apple Motion 一样做动画。',
                subtext: '可以用关键帧、路径和变形。'
            },
            {
                headline: '在幻灯片上放 3D 模型。',
                subtext: '打开 GLB 或 glTF 文件，或用 Meshy 生成。'
            },
            {
                headline: '像 Google Slides 一样协作。',
                subtext: '看到每个人的指针和评论。'
            },
            {
                headline: '在一处查看每页幻灯片的文字。',
                subtext: '打开 View > Outline，用 Markdown 编辑。'
            },
            {
                headline: '像 Figma 一样吸附对象。',
                subtext: '按间距、尺寸和角度对齐。'
            },
            {
                headline: '把演示文稿导出为 4K 视频。',
                subtext: '做动画不需要 After Effects。'
            },
            {
                headline: '让 3D 角色走路或跑步。',
                subtext: '用 Meshy 绑定骨骼和制作动画。'
            },
            {
                headline: '用 ==等号== 包住文字就能高亮。',
                subtext: '**粗体** 和 *斜体* 的用法和 Obsidian 一样。'
            },
            {
                headline: '像 Figma 一样使用自动布局。',
                subtext: '把一组对象排成一行或一列。'
            },
            {
                headline: '用链接分享演示文稿。',
                subtext: '用免费账号发布到网上。'
            },
            {
                headline: '像 Blender 一样的 3D 灯光。',
                subtext: '点光、日光、聚光和面光，都带阴影。'
            },
            {
                headline: '用 Git 管理你的演示文稿。',
                subtext: '演示文稿就是 Markdown 和 JSON 文本文件。'
            },
            {
                headline: '像 Figma 一样创建组件。',
                subtext: '编辑一次，所有实例都会改变。'
            },
            {
                headline: '像 Obsidian 一样挑选主题。',
                subtext: '一键安装免费主题。'
            },
            {
                headline: '把演示文稿放在同步文件夹里。',
                subtext: 'Dropbox、iCloud Drive 和 OneDrive 都可以。'
            },
            {
                headline: '带刚体物理的 3D。',
                subtext: '让物体掉落、倾倒或堆叠。'
            },
            {
                headline: '演讲者备注也是 Markdown。',
                subtext: '它们和幻灯片保存在同一个文件里。'
            },
            {
                headline: '像 Figma 一样组合形状。',
                subtext: '并集、减去、交集或排除。'
            },
            {
                headline: '把代码放到幻灯片上。',
                subtext: '代码块支持 21 种语言的语法高亮。'
            },
            {
                headline: '个人和商业用途都免费。',
                subtext: '下载 Mac 版或 Windows 版。'
            }
        ]
    },
    'zh-TW': {
        heading: '您在用 Canva、Keynote 或 PowerPoint 嗎？',
        credit: '作者：Johan Sanneblad',
        messages: [
            {
                headline: '用 Markdown 寫投影片。',
                subtext: '把文字和圖片拖曳到你要的位置。'
            },
            {
                headline: 'PowerPoint 的免費替代方案。',
                subtext: '分享和協作也都免費。'
            },
            {
                headline: '每份簡報都是電腦裡的一個資料夾。',
                subtext: '製作投影片不需要帳號。'
            },
            {
                headline: '像 Apple Motion 一樣做動畫。',
                subtext: '可以用關鍵影格、路徑和變形。'
            },
            {
                headline: '在投影片上放 3D 模型。',
                subtext: '開啟 GLB 或 glTF 檔案，或用 Meshy 產生。'
            },
            {
                headline: '像 Google Slides 一樣協作。',
                subtext: '看見每個人的指標和留言。'
            },
            {
                headline: '在同一處檢視每張投影片的文字。',
                subtext: '開啟 View > Outline，用 Markdown 編輯。'
            },
            {
                headline: '像 Figma 一樣貼齊物件。',
                subtext: '依間距、尺寸和角度對齊。'
            },
            {
                headline: '把簡報匯出成 4K 影片。',
                subtext: '做動畫不需要 After Effects。'
            },
            {
                headline: '讓 3D 角色走路或跑步。',
                subtext: '用 Meshy 綁定骨架和製作動畫。'
            },
            {
                headline: '用 ==等號== 包住文字就能醒目提示。',
                subtext: '**粗體** 和 *斜體* 的用法和 Obsidian 一樣。'
            },
            {
                headline: '像 Figma 一樣使用自動佈局。',
                subtext: '把一組物件排成一列或一欄。'
            },
            {
                headline: '用連結分享簡報。',
                subtext: '用免費帳號發布到網路上。'
            },
            {
                headline: '像 Blender 一樣的 3D 燈光。',
                subtext: '點光、日光、聚光和面光，都有陰影。'
            },
            {
                headline: '用 Git 管理你的簡報。',
                subtext: '簡報就是 Markdown 和 JSON 純文字檔。'
            },
            {
                headline: '像 Figma 一樣建立元件。',
                subtext: '編輯一次，所有實例都會跟著改變。'
            },
            {
                headline: '像 Obsidian 一樣挑選主題。',
                subtext: '一鍵安裝免費主題。'
            },
            {
                headline: '把簡報放在同步資料夾裡。',
                subtext: 'Dropbox、iCloud Drive 和 OneDrive 都可以。'
            },
            {
                headline: '具備剛體物理的 3D。',
                subtext: '讓物件掉落、傾倒或堆疊。'
            },
            {
                headline: '演講者備忘稿也是 Markdown。',
                subtext: '它們和投影片存在同一個檔案裡。'
            },
            {
                headline: '像 Figma 一樣組合形狀。',
                subtext: '聯集、減去、交集或排除。'
            },
            {
                headline: '把程式碼放上投影片。',
                subtext: '程式碼區塊支援 21 種語言的語法突顯。'
            },
            {
                headline: '個人和商業用途都免費。',
                subtext: '下載 Mac 版或 Windows 版。'
            }
        ]
    }
};
