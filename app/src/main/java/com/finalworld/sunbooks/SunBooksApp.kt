package com.finalworld.sunbooks

import android.graphics.Bitmap
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

private val Beige = Color(0xFFF1E8D8)
private val DarkGray = Color(0xFF242522)
private val Forest = Color(0xFF18392C)
private val Gold = Color(0xFFB78B42)
private val Cream = Color(0xFFFFF7E8)

private enum class Page { HOME, LIBRARY, STATS, SETTINGS, DETAIL }
private enum class AppTheme { SYSTEM, LIGHT, DARK }

@Composable
fun SunBooksApp() {
    var theme by remember { mutableStateOf(AppTheme.LIGHT) }
    val colors = if (theme == AppTheme.DARK) darkColorScheme(
        primary = Gold, background = DarkGray, surface = Color(0xFF30312E), onBackground = Cream, onSurface = Cream
    ) else lightColorScheme(
        primary = Forest, secondary = Gold, background = Beige, surface = Color(0xFFFFFAF1), onBackground = Color(0xFF25251F), onSurface = Color(0xFF25251F)
    )
    MaterialTheme(colorScheme = colors) { Surface(Modifier.fillMaxSize()) { SunBooksRoot(theme) { theme = it } } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SunBooksRoot(theme: AppTheme, setTheme: (AppTheme) -> Unit) {
    val context = LocalContext.current
    val store = remember { LibraryStore(context) }
    val saved = remember { mutableStateListOf<SavedBook>().apply { addAll(store.load()) } }
    var page by remember { mutableStateOf(Page.HOME) }
    var previousPage by remember { mutableStateOf(Page.HOME) }
    var selected by remember { mutableStateOf<VolumeItem?>(null) }
    var homeQuery by remember { mutableStateOf("") }
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    fun persist(value: SavedBook) {
        val index = saved.indexOfFirst { it.item.id == value.item.id }
        if (index >= 0) saved[index] = value else saved.add(value)
        store.save(saved)
    }
    fun openBook(book: VolumeItem, from: Page) { selected = book; previousPage = from; page = Page.DETAIL }

    ModalNavigationDrawer(drawerState = drawer, drawerContent = {
        ModalDrawerSheet {
            Spacer(Modifier.height(28.dp))
            Text("SunBooks", Modifier.padding(20.dp), fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Gold)
            DrawerItem(Icons.Default.Home, "Startsida", page == Page.HOME) { page = Page.HOME; scope.launch { drawer.close() } }
            DrawerItem(Icons.AutoMirrored.Filled.MenuBook, "Mitt bibliotek", page == Page.LIBRARY) { page = Page.LIBRARY; scope.launch { drawer.close() } }
            DrawerItem(Icons.Default.BarChart, "Statistik", page == Page.STATS) { page = Page.STATS; scope.launch { drawer.close() } }
            DrawerItem(Icons.Default.Settings, "Inställningar", page == Page.SETTINGS) { page = Page.SETTINGS; scope.launch { drawer.close() } }
        }
    }) {
        Scaffold(topBar = {
            if (page == Page.HOME) {
                HomeSearchBar(homeQuery, { homeQuery = it }) { scope.launch { drawer.open() } }
            } else {
                TopAppBar(
                    title = { Text(pageTitle(page), maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    navigationIcon = {
                        IconButton(onClick = { if (page == Page.DETAIL) page = previousPage else scope.launch { drawer.open() } }) {
                            Icon(if (page == Page.DETAIL) Icons.AutoMirrored.Filled.ArrowBack else Icons.Default.Menu, null)
                        }
                    }, colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
                )
            }
        }) { padding ->
            Box(Modifier.padding(padding).fillMaxSize()) {
                when (page) {
                    Page.HOME -> HomeScreen(homeQuery, { homeQuery = it }, saved, { persist(it) }) { openBook(it, Page.HOME) }
                    Page.LIBRARY -> LibraryScreen(saved, { persist(it) }) { openBook(it, Page.LIBRARY) }
                    Page.STATS -> StatsScreen(saved)
                    Page.SETTINGS -> SettingsScreen(theme, setTheme)
                    Page.DETAIL -> selected?.let { DetailScreen(it, saved.firstOrNull { b -> b.item.id == it.id }, ::persist) }
                }
            }
        }
    }
}

@Composable
private fun HomeSearchBar(query: String, setQuery: (String) -> Unit, menu: () -> Unit) {
    Surface(color = MaterialTheme.colorScheme.background) {
        Row(Modifier.fillMaxWidth().statusBarsPadding().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(menu) { Icon(Icons.Default.Menu, "Meny") }
            OutlinedTextField(
                value = query, onValueChange = setQuery, modifier = Modifier.weight(1f),
                placeholder = { Text("Sök titel, författare, ISBN eller ASIN", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                leadingIcon = { Icon(Icons.Default.Search, null) }, singleLine = true
            )
        }
    }
}

@Composable
private fun DrawerItem(icon: ImageVector, label: String, selected: Boolean, click: () -> Unit) {
    NavigationDrawerItem(label = { Text(label) }, icon = { Icon(icon, null) }, selected = selected, onClick = click, modifier = Modifier.padding(horizontal = 12.dp))
}

private fun pageTitle(page: Page) = when (page) {
    Page.LIBRARY -> "Mitt bibliotek"; Page.STATS -> "Statistik"; Page.SETTINGS -> "Inställningar"; Page.DETAIL -> "Bokdetaljer"; else -> ""
}

@Composable
private fun HomeScreen(query: String, setQuery: (String) -> Unit, saved: List<SavedBook>, save: (SavedBook) -> Unit, openBook: (VolumeItem) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var advanced by remember { mutableStateOf(false) }
    var results by remember { mutableStateOf<List<VolumeItem>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var resultPage by remember { mutableIntStateOf(0) }
    var scanMessage by remember { mutableStateOf<String?>(null) }
    val api = remember { Retrofit.Builder().baseUrl("https://openlibrary.org/").addConverterFactory(GsonConverterFactory.create()).build().create(OpenLibraryApi::class.java) }

    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicturePreview()) { bitmap: Bitmap? ->
        if (bitmap == null) return@rememberLauncherForActivityResult
        scope.launch {
            scanMessage = "Läser av bilden…"
            val code = readBookCode(bitmap)
            if (code != null) {
                vibrate(context.getSystemService(Vibrator::class.java))
                setQuery(code); resultPage = 0; scanMessage = "Hittade $code"
            } else scanMessage = "Ingen ISBN- eller ASIN-kod hittades. Försök igen med tydligare bild."
        }
    }

    val barcodeScanner = remember {
        val options = GmsBarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_EAN_13, Barcode.FORMAT_EAN_8, Barcode.FORMAT_CODE_128)
            .enableAutoZoom()
            .build()
        GmsBarcodeScanning.getClient(context, options)
    }
    fun scanBarcode() {
        scope.launch {
            scanMessage = "Öppnar streckkodsskannern…"
            runCatching { barcodeScanner.startScan().await().rawValue }
                .onSuccess { value ->
                    if (!value.isNullOrBlank()) {
                        vibrate(context.getSystemService(Vibrator::class.java)); setQuery(value); resultPage = 0; scanMessage = "Hittade $value"
                    } else scanMessage = "Ingen kod hittades."
                }
                .onFailure { scanMessage = "Skanningen avbröts eller kunde inte starta." }
        }
    }

    LaunchedEffect(query, resultPage) {
        if (query.trim().length < 3) { results = emptyList(); error = null; return@LaunchedEffect }
        delay(500); loading = true; error = null
        try {
            val searchQuery = if (query.filter(Char::isDigit).length in listOf(10, 13)) "isbn:${query.filter(Char::isDigit)}" else query.trim()
            val response = api.search(searchQuery, resultPage + 1)
            results = response.docs.map { it.asVolume() }
            if (results.isEmpty()) error = "Inga böcker hittades. Du kan prova titel eller författare."
        } catch (e: Exception) {
            error = if (e is HttpException) "Boktjänsten svarade med fel ${e.code()}. Försök igen senare." else "Kunde inte nå boktjänsten. Kontrollera anslutningen och försök igen."
        } finally { loading = false }
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 12.dp)) {
        TextButton(onClick = { advanced = !advanced }, modifier = Modifier.align(Alignment.End)) {
            Text(if (advanced) "Stäng avancerat" else "Avancerat"); Icon(if (advanced) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null)
        }
        if (advanced) AdvancedPanel(::scanBarcode, { camera.launch(null) }, scanMessage)
        if (query.trim().length < 3) HomeHero(saved.count { it.owned }) else {
            if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
            error?.let { Text(it, color = if (results.isEmpty()) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.error, modifier = Modifier.padding(12.dp)) }
            LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(results, key = { it.id }) { book ->
                    val existing = saved.firstOrNull { it.item.id == book.id }
                    BookRow(book, existing, openBook) { save((existing ?: SavedBook(book)).copy(favorite = it)) }
                }
                if (results.isNotEmpty()) item {
                    Row(Modifier.fillMaxWidth().padding(8.dp), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { if (resultPage > 0) resultPage-- }, enabled = resultPage > 0) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Föregående") }
                        Text("Sida ${resultPage + 1}", maxLines = 1)
                        IconButton(onClick = { resultPage++ }, enabled = results.size == 20) { Icon(Icons.Default.ArrowForward, "Nästa") }
                    }
                }
            }
        }
    }
}

private suspend fun readBookCode(bitmap: Bitmap): String? {
    val image = InputImage.fromBitmap(bitmap, 0)
    val barcode = BarcodeScanning.getClient().process(image).await().firstOrNull()?.rawValue
    val barcodeCode = barcode?.replace("-", "")?.trim()
    if (barcodeCode?.matches(Regex("(?:97[89])?\\d{9}[\\dXx]")) == true) return barcodeCode
    val text = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS).process(image).await().text
    val isbn = Regex("(?i)(?:ISBN(?:-1[03])?[: ]*)?((?:97[89][ -]?)?\\d[\\d -]{8,15}[\\dX])").find(text)?.groupValues?.get(1)?.filter { it.isDigit() || it.uppercaseChar() == 'X' }
    if (isbn?.length in listOf(10, 13)) return isbn
    return Regex("(?i)\\b(?:B0|[A-Z0-9])[A-Z0-9]{9}\\b").find(text)?.value?.uppercase()
}

private fun vibrate(vibrator: Vibrator?) {
    if (Build.VERSION.SDK_INT >= 26) vibrator?.vibrate(VibrationEffect.createOneShot(90, VibrationEffect.DEFAULT_AMPLITUDE)) else @Suppress("DEPRECATION") vibrator?.vibrate(90)
}

@Composable
private fun AdvancedPanel(scanBarcode: () -> Unit, scanText: () -> Unit, message: String?) {
    Card(colors = CardDefaults.cardColors(containerColor = Gold.copy(alpha = .16f)), modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = scanBarcode, modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp), colors = ButtonDefaults.buttonColors(containerColor = Forest, contentColor = Cream)) {
                Icon(Icons.Default.QrCodeScanner, null); Spacer(Modifier.width(10.dp)); Text("Skanna ISBN-streckkod", fontWeight = FontWeight.Bold)
            }
            OutlinedButton(onClick = scanText, modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp)) {
                Icon(Icons.Default.PhotoCamera, null); Spacer(Modifier.width(10.dp)); Text("Läs ISBN eller ASIN som text", fontWeight = FontWeight.SemiBold)
            }
            message?.let { Text(it, color = Gold, fontWeight = FontWeight.SemiBold) }
        }
    }
}

@Composable
private fun HomeHero(ownedCount: Int) {
    Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Image(painterResource(R.drawable.sunbooks_logo), "SunBooks", Modifier.fillMaxWidth(.72f).aspectRatio(1f), contentScale = ContentScale.Fit)
        Spacer(Modifier.height(12.dp)); Text("Böcker jag läst i år", fontWeight = FontWeight.SemiBold, maxLines = 1)
        Text("0", fontSize = 68.sp, fontWeight = FontWeight.Bold, color = Gold)
        Text("$ownedCount böcker i biblioteket", color = MaterialTheme.colorScheme.onSurface.copy(alpha = .65f), maxLines = 1)
    }
}

@Composable
private fun BookRow(book: VolumeItem, saved: SavedBook?, open: (VolumeItem) -> Unit, favorite: (Boolean) -> Unit) {
    Card(Modifier.fillMaxWidth().clickable { open(book) }) {
        Row(Modifier.padding(10.dp).heightIn(min = 112.dp)) {
            AsyncImage(model = book.volumeInfo.imageLinks?.thumbnail, contentDescription = null, modifier = Modifier.width(76.dp).height(108.dp), contentScale = ContentScale.Fit)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(book.volumeInfo.title, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(book.volumeInfo.authors.joinToString().ifBlank { "Okänd författare" }, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(7.dp))
                if (saved?.owned == true) Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                    Icon(Icons.Default.Verified, "Äger", tint = Gold, modifier = Modifier.size(18.dp))
                    if (saved.physical) Icon(Icons.AutoMirrored.Filled.MenuBook, "Fysisk", modifier = Modifier.size(18.dp))
                    if (saved.ebook) Icon(Icons.Default.TabletAndroid, "E-bok", modifier = Modifier.size(18.dp))
                    if (saved.audio) Icon(Icons.Default.Headphones, "Ljudbok", modifier = Modifier.size(18.dp))
                } else Text("Äger inte", style = MaterialTheme.typography.labelMedium)
            }
            IconButton(onClick = { favorite(!(saved?.favorite ?: false)) }) { Icon(if (saved?.favorite == true) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder, "Favorit", tint = Gold) }
        }
    }
}

@Composable
private fun DetailScreen(book: VolumeItem, saved: SavedBook?, save: (SavedBook) -> Unit) {
    val current = saved ?: SavedBook(book)
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Row {
                AsyncImage(model = book.volumeInfo.imageLinks?.thumbnail, contentDescription = null, modifier = Modifier.width(110.dp).height(165.dp), contentScale = ContentScale.Fit)
                Spacer(Modifier.width(14.dp)); Column(Modifier.weight(1f)) {
                    Text(book.volumeInfo.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text(book.volumeInfo.authors.joinToString().ifBlank { "Okänd författare" })
                    book.volumeInfo.publishedDate?.let { Text(it) }; book.volumeInfo.pageCount?.let { Text("$it sidor") }
                }
            }
        }
        item {
            Text("Lägg till i Mitt bibliotek", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            OwnershipCheck("Fysisk bok", Icons.AutoMirrored.Filled.MenuBook, current.physical) { save(current.copy(physical = it)) }
            OwnershipCheck("E-bok", Icons.Default.TabletAndroid, current.ebook) { save(current.copy(ebook = it)) }
            OwnershipCheck("Ljudbok", Icons.Default.Headphones, current.audio) { save(current.copy(audio = it)) }
            if (current.owned) Text("Sparad i Mitt bibliotek", color = Gold, fontWeight = FontWeight.Bold)
        }
        item { Text(book.volumeInfo.categories.joinToString(" · "), color = Gold); Text(book.volumeInfo.description ?: "Ingen beskrivning tillgänglig.") }
        item { Text(book.volumeInfo.industryIdentifiers.joinToString(" · ") { "${it.type}: ${it.identifier}" }, style = MaterialTheme.typography.bodySmall) }
    }
}

@Composable
private fun OwnershipCheck(label: String, icon: ImageVector, checked: Boolean, change: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().clickable { change(!checked) }, verticalAlignment = Alignment.CenterVertically) { Checkbox(checked, change); Icon(icon, null); Spacer(Modifier.width(10.dp)); Text(label) }
}

@Composable
private fun LibraryScreen(saved: List<SavedBook>, save: (SavedBook) -> Unit, open: (VolumeItem) -> Unit) {
    var query by remember { mutableStateOf("") }
    val visible = saved.filter { (it.owned || it.favorite) && (query.length < 3 || it.item.volumeInfo.title.contains(query, true) || it.item.volumeInfo.authors.any { a -> a.contains(query, true) }) }
    Column(Modifier.fillMaxSize().padding(horizontal = 12.dp)) {
        OutlinedTextField(query, { query = it }, modifier = Modifier.fillMaxWidth(), placeholder = { Text("Sök i Mitt bibliotek", maxLines = 1) }, leadingIcon = { Icon(Icons.Default.Search, null) }, singleLine = true)
        Spacer(Modifier.height(10.dp))
        if (visible.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("Inga böcker i biblioteket ännu") }
        else LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) { items(visible.take(20), key = { it.item.id }) { BookRow(it.item, it, open) { fav -> save(it.copy(favorite = fav)) } } }
    }
}

@Composable
private fun StatsScreen(saved: List<SavedBook>) {
    Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Lässtatistik", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        StatCard("Lästa", "0", Icons.Default.CheckCircle); StatCard("DNF", "0", Icons.Default.Cancel); StatCard("DNF for now", "0", Icons.Default.PauseCircle)
        StatCard("Böcker i biblioteket", saved.count { it.owned }.toString(), Icons.AutoMirrored.Filled.MenuBook)
    }
}

@Composable
private fun StatCard(label: String, value: String, icon: ImageVector) { Card(Modifier.fillMaxWidth()) { Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) { Icon(icon, null, tint = Gold); Spacer(Modifier.width(14.dp)); Text(label, Modifier.weight(1f)); Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold) } } }

@Composable
private fun SettingsScreen(theme: AppTheme, setTheme: (AppTheme) -> Unit) {
    LazyColumn(Modifier.fillMaxSize().padding(18.dp)) {
        item { Text("Tema", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
        item { ThemeChoice("Följ telefonens tema", AppTheme.SYSTEM, theme, setTheme) }
        item { ThemeChoice("Ljust beige", AppTheme.LIGHT, theme, setTheme) }
        item { ThemeChoice("Mörkgrått", AppTheme.DARK, theme, setTheme) }
        item { HorizontalDivider(Modifier.padding(vertical = 12.dp)); Text("Språk", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold); ListItem(headlineContent = { Text("Svenska") }) }
    }
}

@Composable
private fun ThemeChoice(label: String, value: AppTheme, current: AppTheme, set: (AppTheme) -> Unit) { Row(Modifier.fillMaxWidth().clickable { set(value) }, verticalAlignment = Alignment.CenterVertically) { RadioButton(current == value, { set(value) }); Text(label) } }
