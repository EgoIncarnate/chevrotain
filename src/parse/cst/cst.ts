import {ISimpleTokenOrIToken, tokenName, getTokenConstructor} from "../../scan/tokens_public"
import {CstNode, CstChildrenDictionary} from "./cst_public"
import {gast} from "../grammar/gast_public"
import {isEmpty, drop, cloneArr, dropRight, last, cloneObj, forEach, has} from "../../utils/utils"
import IProduction = gast.IProduction
import GAstVisitor = gast.GAstVisitor
import NonTerminal = gast.NonTerminal
import Terminal = gast.Terminal
import {HashTable} from "../../lang/lang_extensions"


export function addTerminalToCst(node:CstNode, token:ISimpleTokenOrIToken, isCollection:boolean):void {
    let tokenClassName = tokenName(getTokenConstructor(token))
    if (isCollection) {
        (node.childrenDictionary[tokenClassName] as Array<ISimpleTokenOrIToken>).push(token)
    }
    else {
        node.childrenDictionary[tokenClassName] = token
    }
}

export function addNoneTerminalToCst(node:CstNode, noneTerminal:CstNode, isCollection:boolean):void {
    let tokenClassName = noneTerminal.name
    if (isCollection) {
        (node.childrenDictionary[tokenClassName] as Array<CstNode>).push(noneTerminal)
    }
    else {
        node.childrenDictionary[tokenClassName] = noneTerminal
    }
}

export function buildisCollectionForTopRules(topRules:gast.Rule[]):HashTable<HashTable<CST_SUBTYPE>> {
    let result = new HashTable<HashTable<CST_SUBTYPE>>()

    forEach(topRules, (currTopRule) => {
        let currRuleIsCollection = buildIsCollection(currTopRule.definition)
        result.put(currTopRule.name, currRuleIsCollection)
    })

    return result
}

export enum CST_SUBTYPE {NONE, COLLECTION, OPTIONAL}

export class IsCollectionInitVisitor extends GAstVisitor {

    public result:HashTable<CST_SUBTYPE>

    constructor() {
        super()
        this.result = new HashTable<CST_SUBTYPE>()
    }

    public visitNonTerminal(node:NonTerminal):any {
        let id = node.nonTerminalName
        this.result.put(id, CST_SUBTYPE.NONE)
    }

    public visitTerminal(node:Terminal):any {
        let id = tokenName(node.terminalType)
        this.result.put(id, CST_SUBTYPE.NONE)
    }
}

export function buildIsCollection(initialDef:IProduction[], inIteration:boolean[] = []):HashTable<CST_SUBTYPE> {

    let initVisitor = new IsCollectionInitVisitor()
    let wrapperRule = new gast.Rule("wrapper", initialDef)
    wrapperRule.accept(initVisitor)

    let result = initVisitor.result

    let possiblePaths = []
    possiblePaths.push({def: initialDef, inIteration: inIteration, currResult: {}})

    while (!isEmpty(possiblePaths)) {
        let currPath = possiblePaths.pop()

        let currDef:IProduction[] = currPath.def
        let currInIteration = currPath.inIteration
        let currResult = currPath.currResult

        // For Example: an empty path could exist in a valid grammar in the case of an EMPTY_ALT
        if (isEmpty(currDef)) {
            continue
        }

        const EXIT_ITERATION:any = "EXIT_ITERATION"

        let prod = currDef[0]
        if (prod === EXIT_ITERATION) {
            let nextPath = {
                def:         drop(currDef),
                inIteration: dropRight(inIteration),
                currResult:  cloneObj(currResult)
            }
            possiblePaths.push(nextPath)
        }
        else if (prod instanceof gast.Terminal) {
            let terminalName = tokenName(prod.terminalType)
            if (!has(currResult, terminalName)) {
                currResult[terminalName] = 0
            }
            currResult[terminalName] += 1

            let occurrencesFound = currResult[terminalName]
            if (occurrencesFound > 1 || last(inIteration)) {
                result.put(terminalName, CST_SUBTYPE.COLLECTION)
            }

            let nextPath = {
                def:         drop(currDef),
                inIteration: currInIteration,
                currResult:  cloneObj(currResult)
            }
            possiblePaths.push(nextPath)
        }
        else if (prod instanceof gast.NonTerminal) {
            let nonTerminalName = prod.nonTerminalName
            if (!has(currResult, nonTerminalName)) {
                currResult[nonTerminalName] = 0
            }
            currResult[nonTerminalName] += 1

            let occurrencesFound = currResult[nonTerminalName]
            if (occurrencesFound > 1 || last(inIteration)) {
                result.put(nonTerminalName, CST_SUBTYPE.COLLECTION)
            }

            let nextPath = {
                def:         drop(currDef),
                inIteration: currInIteration,
                currResult:  cloneObj(currResult)
            }
            possiblePaths.push(nextPath)
        }
        else if (prod instanceof gast.Option) {
            let nextPathWith = {
                def:         prod.definition.concat(drop(currDef)),
                inIteration: currInIteration,
                currResult:  cloneObj(currResult)
            }
            possiblePaths.push(nextPathWith)
        }

        else if (prod instanceof gast.RepetitionMandatory || prod instanceof gast.Repetition) {
            let nextDef = prod.definition.concat(drop(currDef))
            let newInIteration = cloneArr(inIteration)
            newInIteration.push(true)
            let nextPath = {
                def:         nextDef,
                inIteration: newInIteration,
                currResult:  cloneObj(currResult)
            }
            possiblePaths.push(nextPath)
            possiblePaths.push(EXIT_ITERATION)
        }
        else if (prod instanceof gast.RepetitionMandatoryWithSeparator || prod instanceof gast.RepetitionWithSeparator) {
            let separatorGast = new gast.Terminal(prod.separator)
            let secondIteration:any = new gast.Repetition([<any>separatorGast].concat(prod.definition), prod.occurrenceInParent)
            // Hack: X (, X)* --> (, X) because it is identical in terms of identifying "isCollection?"
            let nextDef = [secondIteration].concat(drop(currDef))
            let newInIteration = cloneArr(inIteration)
            newInIteration.push(true)
            let nextPath = {
                def:         nextDef,
                inIteration: newInIteration,
                currResult:  cloneObj(currResult)
            }
            possiblePaths.push(nextPath)
            possiblePaths.push(EXIT_ITERATION)
        }
        else if (prod instanceof gast.Alternation) {
            // the order of alternatives is meaningful, FILO (Last path will be traversed first).
            for (let i = prod.definition.length - 1; i >= 0; i--) {
                let currAlt:any = prod.definition[i]
                let currAltPath = {
                    def:         currAlt.definition.concat(drop(currDef)),
                    inIteration: currInIteration,
                    currResult:  cloneObj(currResult)
                }
                possiblePaths.push(currAltPath)
            }
        }
        else if (prod instanceof gast.Flat) {
            possiblePaths.push({
                def:         prod.definition.concat(drop(currDef)),
                inIteration: currInIteration,
                currResult:  cloneObj(currResult)
            })
        }
        else {
            throw Error("non exhaustive match")
        }
    }
    return result
}

export function initChildrenDictionary(isCollection:HashTable<CST_SUBTYPE>):CstChildrenDictionary {
    let childrenDictionary = {}

    forEach(isCollection.keys(), (key) => {
        let value = isCollection.get(key)
        if (value === CST_SUBTYPE.COLLECTION) {
            childrenDictionary[key] = []
        }
    })
    return childrenDictionary
}
