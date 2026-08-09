package com.finalworld.sunbooks

import com.google.gson.annotations.SerializedName
import retrofit2.http.GET
import retrofit2.http.Query

data class VolumeResponse(val items: List<VolumeItem>? = emptyList(), val totalItems: Int = 0)
data class VolumeItem(val id: String, val volumeInfo: VolumeInfo)
data class VolumeInfo(
    val title: String = "Okänd titel",
    val authors: List<String>? = emptyList(),
    val description: String? = null,
    val publishedDate: String? = null,
    val pageCount: Int? = null,
    val categories: List<String>? = emptyList(),
    val language: String? = null,
    val publisher: String? = null,
    val imageLinks: ImageLinks? = null,
    val industryIdentifiers: List<IndustryIdentifier>? = emptyList()
)
data class ImageLinks(val thumbnail: String? = null, val smallThumbnail: String? = null)
data class IndustryIdentifier(val type: String, val identifier: String)

interface GoogleBooksApi {
    @GET("books/v1/volumes")
    suspend fun search(
        @Query("q") query: String,
        @Query("startIndex") startIndex: Int,
        @Query("maxResults") maxResults: Int = 20,
        @Query("printType") printType: String = "books"
    ): VolumeResponse
}
