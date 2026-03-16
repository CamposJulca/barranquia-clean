import { materialsMock } from "../mock/materialsMock"
import { duplicatesMock } from "../mock/duplicatesMock"
import { normalizationMock } from "../mock/normalizationMock"
import { analyticsMock } from "../mock/analyticsMock"
import { semanticSearchMock } from "../mock/semanticSearchMock"

const delay = (data) =>
  new Promise((resolve) => setTimeout(() => resolve(data), 400))

export const getMaterials = () => delay(materialsMock)

export const getDuplicates = () => delay(duplicatesMock)

export const getNormalization = () => delay(normalizationMock)

export const getAnalytics = () => delay(analyticsMock)

export const semanticSearch = (query) => delay(semanticSearchMock)