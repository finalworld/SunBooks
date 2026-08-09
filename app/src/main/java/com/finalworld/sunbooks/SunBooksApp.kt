package com.finalworld.sunbooks

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

private val Beige = Color(0xFFF1E8D8)
private val DarkGray = Color(0xFF242522)
private val Forest = Color(0xFF18392C)
private val Gold = Color(0xFFB78B42)
private val Cream = Color(0xFFFFF7E8)

enum class Page { HOME, LIBRARY, STATS, SETTINGS, DETAIL }
enum class AppTheme { SYSTEM, LIGHT, DARK }
data class SavedBook(
    val item: VolumeItem,
    val physical: Boolean = false,
    val ebook: Boolean = false,
    val audio: Boolean = false,
    val favorite: Boolean = false
) { val owned get() = physical || ebook || audio }

@Composable
fun SunBooksApp() {
    var theme by remember { mutableStateOf(AppTheme.LIGHT) }
    val dark = theme == AppTheme.DARK
    val scheme = if (dark) darkColorScheme(primary = Gold, background = DarkGray, surface = Color(0xFF30312E), onBackground = Cream, onSurface = Cream)
    else lightColorScheme(primary = Forest, secondary = Gold, background = Beige, surface = Color(0xFFFFFAF1), onBackground = Color(0xFF25251F), onSurface = Color(0xFF25251F))
    MaterialTheme(colorScheme = scheme) {
        Surface(Modifier.fillMaxSize()) { SunBooksRoot(theme) { theme = it } }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SunBooksRoot(theme: AppTheme, setTheme: (AppTheme) -> Unit) {
    var page by remember { mutableStateOf(Page.HOME) }
    var previousPage by remember { mutableStateOf(Page.HOME) }
    var selected by remember { mutableStateOf<VolumeItem?>(null) }
    val saved = remember { mutableStateListOf<SavedBook>() }
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    ModalNavigationDrawer(
        drawerState = drawer,
        drawerContent = {
            ModalDrawerSheet {
                Spacer(Modifier.height(28.dp))
                Text("SunBooks", Modifier.padding(20.dp), fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Gold)
                NavigationDrawerItem(Icons.Default.Home, "Startsida", page == Page.HOME) { page = Page.HOME; scope.launch { drawer.close() } }
                NavigationDrawerItem(Icons.Default.MenuBook, "Mitt bibliotek", page == Page.LIBRARY) { page = Page.LIBRARY; scope.launch { drawer.close() } }
                NavigationDrawerItem(Icons.Default.BarChart, "Statistik", page == Page.STATS) { page = Page.STATS; scope.launch { drawer.close() } }
                NavigationDrawerItem(Icons.Default.Settings, "Inställningar", page == Page.SETTINGS) { page = Page.SETTINGS; scope.launch { drawer.close() } }
            }
        }
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text(if (page == Page.HOME) "SunBooks" else pageTitle(page)) },
                    navigationIcon = {
                        IconButton(onClick = { if (page == Page.DETAIL) page = previousPage else scope.launch { drawer.open() } }) {
                            Icon(if (page == Page.DETAIL) Icons.Default.ArrowBack else Icons.Default.Menu, null)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
                )
            }
        ) { padding ->
            Box(Modifier.padding(padding).fillMaxSize()) {
                when (page) {
                    Page.HOME -> HomeScreen(saved) { book -> selected = book; previousPage = Page.HOME; page = Page.DETAIL }
                    Page.LIBRARY -> LibraryScreen(saved) { book -> selected = book; previousPage = Page.LIBRARY; page = Page.DETAIL }
                    Page.STATS -> StatsScreen(saved)
                    Page.SETTINGS -> SettingsScreen(theme, setTheme)
                    Page.DETAIL -> selected?.let { book -> DetailScreen(book, saved) }
                }
            }
        }
    }
}

@Composable
private fun NavigationDrawerItem(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String, selected: Boolean, click: () -> Unit) {
    NavigationDrawerItem(label = { Text(text) }, icon = { Icon(icon, null) }, selected = selected, onClick = click, modifier = Modifier.padding(horizontal = 12.dp))
}

private fun pageTitle(page: Page) = when (page) {
    Page.LIBRARY -> "Mitt bibliotek"; Page.STATS -> "Statistik"; Page.SETTINGS -> "Inställningar"; Page.DETAIL -> "Bokdetaljer"; else -> "SunBooks"
}

@Composable
private fun HomeScreen(saved: MutableList<SavedBook>, openBook: (VolumeItem) -> Unit) {
    var query by remember { mutableStateOf("") }
    var advanced by remember { mutableStateOf(false) }
    var results by remember { mutableStateOf<List<VolumeItem>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var page by remember { mutableIntStateOf(0) }
    val api = remember { Retrofit.Builder().baseUrl("https://www.googleapis.com/").addConverterFactory(GsonConverterFactory.create()).build().create(GoogleBooksApi::class.java) }

    LaunchedEffect(query, page) {
        if (query.trim().length < 3) { results = emptyList(); error = null; return@LaunchedEffect }
        delay(500)
        loading = true; error = null
        runCatching { api.search(query.trim(), page * 20) }
            .onSuccess { results = it.items.orEmpty() }
            .onFailure { error = "Kunde inte hämta böcker. Kontrollera internetanslutningen." }
        loading = false
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = query, onValueChange = { query = it; page = 0 },
                placeholder = { Text("Sök titel, författare, ISBN eller ASIN") },
                leadingIcon = { Icon(Icons.Default.Search, null) },
                singleLine = true, modifier = Modifier.weight(1f)
            )
            TextButton(onClick = { advanced = !advanced }) { Text("Avancerad") }
        }
        if (advanced) AdvancedPanel()
        if (query.length < 3) {
            HomeHero(saved.count { it.owned })
        } else {
            if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(12.dp)) }
            LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(results, key = { it.id }) { book ->
                    val own = saved.firstOrNull { it.item.id == book.id }
                    BookRow(book, own, openBook) { favorite ->
                        val index = saved.indexOfFirst { it.item.id == book.id }
                        if (index >= 0) saved[index] = saved[index].copy(favorite = favorite)
                        else saved.add(SavedBook(book, favorite = favorite))
                    }
                }
                item {
                    Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.Center) {
                        OutlinedButton(onClick = { if (page > 0) page-- }, enabled = page > 0) { Text("Föregående") }
                        Text("Sida ${page + 1}", Modifier.padding(18.dp, 10.dp))
                        OutlinedButton(onClick = { page++ }, enabled = results.size == 20) { Text("Nästa") }
                    }
                }
            }
        }
    }
}

@Composable
private fun HomeHero(ownedCount: Int) {
    Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Image(painterResource(com.finalworld.sunbooks.R.drawable.sunbooks_logo), "SunBooks", Modifier.size(270.dp), contentScale = ContentScale.Fit)
        Spacer(Modifier.height(20.dp))
        Text("Antal böcker jag läste i år", fontWeight = FontWeight.SemiBold)
        Text("0", fontSize = 72.sp, fontWeight = FontWeight.Bold, color = Gold)
        Text("$ownedCount böcker i biblioteket", color = MaterialTheme.colorScheme.onSurface.copy(alpha = .65f))
    }
}

@Composable
private fun AdvancedPanel() {
    Surface(color = Gold.copy(alpha = .16f), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.PhotoCamera, null, tint = Gold)
                Spacer(Modifier.width(10.dp)); Text("Skanna ISBN, streckkod eller ASIN", fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(10.dp))
            Text("Fler filter: titel · författare · genre · språk · publiceringsår · antal sidor", fontSize = 13.sp)
        }
    }
}

@Composable
private fun BookRow(book: VolumeItem, saved: SavedBook?, open: (VolumeItem) -> Unit, favorite: (Boolean) -> Unit) {
    Card(Modifier.fillMaxWidth().clickable { open(book) }) {
        Row(Modifier.padding(10.dp).heightIn(min = 112.dp)) {
            AsyncImage(model = book.volumeInfo.imageLinks?.thumbnail?.replace("http://", "https://"), contentDescription = null, modifier = Modifier.width(76.dp).fillMaxHeight(), contentScale = ContentScale.Fit)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(book.volumeInfo.title, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(book.volumeInfo.authors?.joinToString() ?: "Okänd författare", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = .7f))
                Spacer(Modifier.height(7.dp))
                if (saved?.owned == true) {
                    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        Icon(Icons.Default.Verified, "Äger", tint = Gold, modifier = Modifier.size(18.dp))
                        if (saved.physical) Icon(Icons.Default.MenuBook, "Fysisk", modifier = Modifier.size(18.dp))
                        if (saved.ebook) Icon(Icons.Default.TabletAndroid, "E-bok", modifier = Modifier.size(18.dp))
                        if (saved.audio) Icon(Icons.Default.Headphones, "Ljudbok", modifier = Modifier.size(18.dp))
                    }
                } else Text("Äger inte", fontSize = 12.sp)
            }
            IconButton(onClick = { favorite(!(saved?.favorite ?: false)) }) {
                Icon(if (saved?.favorite == true) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder, "Favorit", tint = Gold)
            }
        }
    }
}

@Composable
private fun DetailScreen(book: VolumeItem, saved: MutableList<SavedBook>) {
    val index = saved.indexOfFirst { it.item.id == book.id }
    val current = if (index >= 0) saved[index] else SavedBook(book)
    LazyColumn(Modifier.fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Row {
                AsyncImage(model = book.volumeInfo.imageLinks?.thumbnail?.replace("http://", "https://"), contentDescription = null, modifier = Modifier.width(120.dp).height(180.dp), contentScale = ContentScale.Fit)
                Spacer(Modifier.width(16.dp))
                Column {
                    Text(book.volumeInfo.title, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text(book.volumeInfo.authors?.joinToString() ?: "Okänd författare", fontSize = 17.sp)
                    Spacer(Modifier.height(10.dp))
                    Text(listOfNotNull(book.volumeInfo.publisher, book.volumeInfo.publishedDate).joinToString(" · "))
                    book.volumeInfo.pageCount?.let { Text("$it sidor") }
                }
            }
        }
        item {
            Text("Jag äger", fontSize = 19.sp, fontWeight = FontWeight.Bold)
            OwnershipCheck("Fysisk bok", Icons.Default.MenuBook, current.physical) { updateSaved(saved, current.copy(physical = it)) }
            OwnershipCheck("E-bok", Icons.Default.TabletAndroid, current.ebook) { updateSaved(saved, current.copy(ebook = it)) }
            OwnershipCheck("Ljudbok", Icons.Default.Headphones, current.audio) { updateSaved(saved, current.copy(audio = it)) }
        }
        item {
            Text("Lässtatus", fontSize = 19.sp, fontWeight = FontWeight.Bold)
            AssistChip(onClick = {}, label = { Text("Oläst") }, leadingIcon = { Icon(Icons.Default.Book, null) })
        }
        item {
            book.volumeInfo.categories?.takeIf { it.isNotEmpty() }?.let { Text(it.joinToString(" · "), color = Gold) }
            Text(book.volumeInfo.description ?: "Ingen beskrivning tillgänglig.", lineHeight = 22.sp)
        }
        item {
            val isbn = book.volumeInfo.industryIdentifiers?.joinToString(" · ") { "${it.type}: ${it.identifier}" }
            if (!isbn.isNullOrBlank()) Text(isbn, fontSize = 13.sp)
        }
    }
}

private fun updateSaved(saved: MutableList<SavedBook>, value: SavedBook) {
    val i = saved.indexOfFirst { it.item.id == value.item.id }
    if (i >= 0) saved[i] = value else saved.add(value)
}

@Composable
private fun OwnershipCheck(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, checked: Boolean, change: (Boolean) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().clickable { change(!checked) }) {
        Checkbox(checked, change); Icon(icon, null); Spacer(Modifier.width(10.dp)); Text(label)
    }
}

@Composable
private fun LibraryScreen(saved: MutableList<SavedBook>, open: (VolumeItem) -> Unit) {
    var query by remember { mutableStateOf("") }
    var filters by remember { mutableStateOf(false) }
    val visible = saved.filter { (it.owned || it.favorite) && (query.length < 3 || it.item.volumeInfo.title.contains(query, true) || it.item.volumeInfo.authors.orEmpty().any { a -> a.contains(query, true) }) }
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(query, { query = it }, placeholder = { Text("Sök i Mitt bibliotek") }, leadingIcon = { Icon(Icons.Default.Search, null) }, singleLine = true, modifier = Modifier.weight(1f))
            IconButton(onClick = { filters = !filters }) { Icon(Icons.Default.FilterList, "Filter") }
        }
        if (filters) Surface(color = Gold.copy(alpha = .15f), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) { Text("Favoriter · Format · Lässtatus · Genre · Betyg · Läsår · Antal sidor", Modifier.padding(16.dp)) }
        if (visible.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("Inga böcker hittades") }
        else LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(visible.take(20), key = { it.item.id }) { item -> BookRow(item.item, item, open) { fav -> updateSaved(saved, item.copy(favorite = fav)) } }
        }
    }
}

@Composable
private fun StatsScreen(saved: List<SavedBook>) {
    Column(Modifier.fillMaxSize().padding(22.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        var year by remember { mutableStateOf("2026") }
        Text("Lässtatistik", fontSize = 28.sp, fontWeight = FontWeight.Bold)
        OutlinedButton(onClick = { year = if (year == "2026") "Alla år" else "2026" }) { Text(year); Icon(Icons.Default.ArrowDropDown, null) }
        StatCard("Lästa", "0", Icons.Default.CheckCircle)
        StatCard("DNF", "0", Icons.Default.Cancel)
        StatCard("DNF for now", "0", Icons.Default.PauseCircle)
        StatCard("Böcker i biblioteket", saved.count { it.owned }.toString(), Icons.Default.MenuBook)
    }
}

@Composable
private fun StatCard(label: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Card(Modifier.fillMaxWidth()) { Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) { Icon(icon, null, tint = Gold); Spacer(Modifier.width(14.dp)); Text(label, Modifier.weight(1f)); Text(value, fontSize = 26.sp, fontWeight = FontWeight.Bold) } }
}

@Composable
private fun SettingsScreen(theme: AppTheme, setTheme: (AppTheme) -> Unit) {
    LazyColumn(Modifier.fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { Text("Tema", fontSize = 22.sp, fontWeight = FontWeight.Bold) }
        item { ThemeChoice("Följ telefonens tema", AppTheme.SYSTEM, theme, setTheme) }
        item { ThemeChoice("Ljust beige", AppTheme.LIGHT, theme, setTheme) }
        item { ThemeChoice("Mörkgrått", AppTheme.DARK, theme, setTheme) }
        item { HorizontalDivider(Modifier.padding(vertical = 10.dp)); Text("Språk", fontSize = 22.sp, fontWeight = FontWeight.Bold); ListItem(headlineContent = { Text("Svenska") }, trailingContent = { Icon(Icons.Default.ArrowDropDown, null) }) }
        item { HorizontalDivider(); Text("Tillgänglighet", fontSize = 22.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 12.dp)); SettingSwitch("Stäng av animationer", false); SettingSwitch("Vibration vid lyckad skanning", true) }
        item { HorizontalDivider(); ListItem(headlineContent = { Text("Boktjänster och enheter") }, leadingContent = { Icon(Icons.Default.Devices, null) }); ListItem(headlineContent = { Text("Papperskorg") }, supportingContent = { Text("Böcker sparas i 30 dagar") }, leadingContent = { Icon(Icons.Default.DeleteOutline, null) }) }
    }
}

@Composable
private fun ThemeChoice(label: String, value: AppTheme, current: AppTheme, set: (AppTheme) -> Unit) {
    Row(Modifier.fillMaxWidth().clickable { set(value) }, verticalAlignment = Alignment.CenterVertically) { RadioButton(current == value, { set(value) }); Text(label) }
}

@Composable
private fun SettingSwitch(label: String, initial: Boolean) {
    var checked by remember { mutableStateOf(initial) }
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { Text(label, Modifier.weight(1f)); Switch(checked, { checked = it }) }
}
