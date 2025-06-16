import { computed, Ref } from 'vue'
import { ComparisonData, MatchSentenceUI } from '@/shared/types'

export function useComparisonData(
  comparisonData: Ref<ComparisonData>,
  enabledSources: Ref<Record<string, boolean>>,
  similarityThreshold: Ref<number>
) {
  const matchesDTO = computed<MatchSentenceUI[]>(() => {
    return Object.values(comparisonData.value).flatMap((sentence) =>
      sentence.matchedSentences.map((match) => ({
        ...match,
        sourceSentenceId: sentence.sentenceId,
        sourceText: sentence.text
      }))
    )
  })

  const filteredMatches = computed<MatchSentenceUI[]>(() => {
    return matchesDTO.value.filter((match) => {
      return (
        enabledSources.value[match.docId] &&
        !match.isDeleted &&
        match.similarity >= similarityThreshold.value
      )
    })
  })

  const modifiedPairs = computed<MatchSentenceUI[]>(() => {
    return matchesDTO.value.filter((match) => {
      return match.isDeleted || match.reasonType || match.reasonText
    })
  })

  const matchedSentence = computed<Set<number>>(() => {
    const matchedSentence = new Set<number>()
    for (const match of filteredMatches.value) {
      matchedSentence.add(match.sourceSentenceId)
    }
    return matchedSentence
  })

  return {
    matchedSentence,
    matchesDTO,
    filteredMatches,
    modifiedPairs
  }
}
