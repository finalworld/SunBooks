package com.finalworld.sunbooks

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

data class SavedBook(
    val item: VolumeItem,
    val physical: Boolean = false,
    val ebook: Boolean = false,
    val audio: Boolean = false,
    val favorite: Boolean = false
) { val owned get() = physical || ebook || audio }

class LibraryStore(context: Context) {
    private val preferences = context.getSharedPreferences("sunbooks_library", Context.MODE_PRIVATE)
    private val gson = Gson()

    fun load(): List<SavedBook> = runCatching {
        val json = preferences.getString("books", null) ?: return emptyList()
        gson.fromJson<List<SavedBook>>(json, object : TypeToken<List<SavedBook>>() {}.type)
    }.getOrDefault(emptyList())

    fun save(books: List<SavedBook>) {
        preferences.edit().putString("books", gson.toJson(books)).apply()
    }
}
