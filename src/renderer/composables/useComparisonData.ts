import { computed, Ref, ref } from 'vue'
import { ComparisonData, HighlightData, MatchSentenceUI, ReasonType } from '@/shared/types'

export function useComparisonData(
  comparisonData: Ref<ComparisonData>,
  enabledSources: Ref<Record<string, boolean>>,
  similarityThreshold: Ref<number>
) {
  const showDeleteDialog = ref(false)
  const selectedMatch = ref<MatchSentenceUI>()
  const reasonType = ref<ReasonType>()
  const reasonText = ref('')

  // const matchesDTO = computed<MatchSentenceUI[]>(() => {
  //   return Object.values(comparisonData.value).flatMap((sentence) =>
  //     sentence.matchedSentences.map((match) => ({
  //       ...match,
  //       sourceSentenceId: sentence.sentenceId,
  //       sourceText: sentence.text
  //     }))
  //   )
  // })

  const filteredMatches = computed<MatchSentenceUI[]>(() => {
    // return matchesDTO.value.filter((match) => {
    //   return (
    //     enabledSources.value[match.docId] &&
    //     !match.isDeleted &&
    //     match.similarity >= similarityThreshold.value
    //   )
    // })
    return Object.values(comparisonData.value).flatMap((sentence) =>
      sentence.matchedSentences
        .filter((match) => {
          return (
            enabledSources.value[match.docId] &&
            !match.isDeleted &&
            match.similarity >= similarityThreshold.value
          )
        })
        .map((match) => ({
          ...match,
          sourceSentenceId: sentence.sentenceId,
          sourceText: sentence.text
        }))
    )
  })

  const modifiedPairs = computed<MatchSentenceUI[]>(() => {
    return Object.values(comparisonData.value).flatMap((sentence) =>
      sentence.matchedSentences
        .filter((match) => {
          return (
            enabledSources.value[match.docId] &&
            match.isDeleted &&
            match.similarity >= similarityThreshold.value
          )
        })
        .map((match) => ({
          ...match,
          sourceSentenceId: sentence.sentenceId,
          sourceText: sentence.text
        }))
    )
  })

  const matchedSentence = computed<Set<number>>(() => {
    const matchedSentence = new Set<number>()
    for (const match of filteredMatches.value) {
      matchedSentence.add(match.sourceSentenceId)
    }
    return matchedSentence
  })

  const handleDeleteMatch = (match: MatchSentenceUI) => {
    selectedMatch.value = match
    showDeleteDialog.value = true
  }

  const handleRestoreMatch = (match: MatchSentenceUI) => {
    comparisonData.value[match.sourceSentenceId].matchedSentences = comparisonData.value[
      match.sourceSentenceId
    ].matchedSentences.map((m) => {
      if (m.sentenceId === match.sentenceId && m.docId === match.docId) {
        return {
          ...m,
          isDeleted: false,
          reasonType: undefined,
          reasonText: ''
        }
      }
      return m
    })
  }

  const handleEditMatch = (match: MatchSentenceUI) => {
    selectedMatch.value = match
    reasonType.value = match.reasonType
    reasonText.value = match.reasonText || ''
    showDeleteDialog.value = true
    comparisonData.value[match.sourceSentenceId].matchedSentences = comparisonData.value[
      match.sourceSentenceId
    ].matchedSentences.map((m) => {
      if (m.sentenceId === match.sentenceId && m.docId === match.docId) {
        return {
          ...m,
          isDeleted: true,
          reasonType: match.reasonType,
          reasonText: match.reasonText || ''
        }
      }
      return m
    })
  }

  const saveDeleteReason = () => {
    if (selectedMatch.value) {
      comparisonData.value[selectedMatch.value.sourceSentenceId].matchedSentences =
        comparisonData.value[selectedMatch.value.sourceSentenceId].matchedSentences.map((m) => {
          if (
            m.sentenceId === selectedMatch.value.sentenceId &&
            m.docId === selectedMatch.value.docId
          ) {
            return {
              ...m,
              isDeleted: true,
              reasonType: reasonType.value,
              reasonText: reasonText.value
            }
          }
          return m
        })
    }
    showDeleteDialog.value = false
    reasonText.value = ''
  }

  return {
    matchedSentence,
    filteredMatches,
    modifiedPairs,
    showDeleteDialog,
    selectedMatch,
    reasonType,
    reasonText,
    handleDeleteMatch,
    handleRestoreMatch,
    handleEditMatch,
    saveDeleteReason
  }
}
