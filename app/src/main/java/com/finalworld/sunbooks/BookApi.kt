package com.finalworld.sunbooks

import retrofit2.http.GET
import retrofit2.http.Query

data class VolumeItem(val id: String, val volumeInfo: VolumeInfo)
data class VolumeInfo(
    val title: String = "Okänd titel",
    val authors: List<String> = emptyList(),
    val description: String? = null,
    val publishedDate: String? = null,
    val pageCount: Int? = null,
    val categories: List<String> = emptyList(),
    val language: String? = null,
    val publisher: String? = null,
    val imageLinks: ImageLinks? = null,
    val industryIdentifiers: List<IndustryIdentifier> = emptyList()
)
data class ImageLinks(val thumbnail: String? = null)
data class IndustryIdentifier(val type: String, val identifier: String)

data class OpenLibraryResponse(val numFound: Int = 0, val docs: List<OpenLibraryDoc> = emptyList())
data class OpenLibraryDoc(
    val key: String = "",
    val title: String = "Okänd titel",
    val author_name: List<String>? = null,
    val first_publish_year: Int? = null,
    val cover_i: Long? = null,
    val isbn: List<String>? = null,
    val number_of_pages_median: Int? = null,
    val subject: List<String>? = null,
    val language: List<String>? = null,
    val publisher: List<String>? = null
) {
    fun asVolume() = VolumeItem(
        id = key.ifBlank { "manual-${title.hashCode()}" },
        volumeInfo = VolumeInfo(
            title = title,
            authors = author_name.orEmpty(),
            publishedDate = first_publish_year?.toString(),
            pageCount = number_of_pages_median,
            categories = subject.orEmpty().take(5),
            language = language?.firstOrNull(),
            publisher = publisher?.firstOrNull(),
            imageLinks = cover_i?.let { ImageLinks("https://covers.openlibrary.org/b/id/$it-L.jpg") },
            industryIdentifiers = isbn.orEmpty().take(3).map {
                IndustryIdentifier(if (it.length == 13) "ISBN_13" else "ISBN_10", it)
            }
        )
    )
}

interface OpenLibraryApi {
    @GET("search.json")
    suspend fun search(
        @Query("q") query: String,
        @Query("page") page: Int,
        @Query("limit") limit: Int = 20,
        @Query("fields") fields: String = "key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,subject,language,publisher"
    ): OpenLibraryResponse
}
