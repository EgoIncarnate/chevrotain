import {Token, extendToken} from "../../src/scan/tokens_public"
import {Parser} from "../../src/parse/parser_public"
import {exceptions} from "../../src/parse/exceptions_public"
import {clearCache} from "../../src/parse/cache_public"
import {tokenInstanceofMatcher, augmentTokenClasses} from "../../src/scan/tokens"
import {createRegularToken} from "../utils/matchers"
import MismatchedTokenException = exceptions.MismatchedTokenException
import NoViableAltException = exceptions.NoViableAltException
import EarlyExitException = exceptions.EarlyExitException

function defineCstSpecs(contextName, extendToken, createToken, tokenMatcher) {

    context.only("CST " + contextName, () => {

        let A = extendToken("A")
        let B = extendToken("B")
        let C = extendToken("C")

        const ALL_TOKENS = [A, B, C]

        it("Can output a CST for a Terminal", () => {
            class CstTerminalParser extends Parser {

                constructor(input:Token[] = []) {
                    super(input, ALL_TOKENS, {outputCst: true});
                    (<any>Parser).performSelfAnalysis(this)
                }

                public testRule = this.RULE("testRule", () => {
                    this.CONSUME(A)
                    this.CONSUME(B)
                })
            }

            let input = [createToken(A), createToken(B)]
            let parser = new CstTerminalParser(input)
            let cst = parser.testRule()
            expect(cst.name).to.equal("testRule")
            expect(cst.childrenDictionary).to.have.keys("A", "B")
            expect(cst.childrenDictionary.A).to.be.an.instanceof(A)
            expect(cst.childrenDictionary.B).to.be.an.instanceof(B)
        })

        it("Can output a CST for a Terminal with multiple occurrences", () => {
            class CstMultiTerminalParser extends Parser {

                constructor(input:Token[] = []) {
                    super(input, ALL_TOKENS, {outputCst: true});
                    (<any>Parser).performSelfAnalysis(this)
                }

                public testRule = this.RULE("testRule", () => {
                    this.CONSUME(A)
                    this.CONSUME(B)
                    this.CONSUME2(A)
                })
            }

            let input = [createToken(A), createToken(B), createToken(A)]
            let parser = new CstMultiTerminalParser(input)
            let cst = parser.testRule()
            expect(cst.name).to.equal("testRule")
            expect(cst.childrenDictionary).to.have.keys("A", "B")
            expect(cst.childrenDictionary.A).to.have.length(2)
            expect(cst.childrenDictionary.A[0]).to.be.an.instanceof(A)
            expect(cst.childrenDictionary.A[1]).to.be.an.instanceof(A)
            expect(cst.childrenDictionary.B).to.be.an.instanceof(B)
        })

        after(() => {
            clearCache()
        })
    })
}

defineCstSpecs("Regular Tokens Mode", extendToken, createRegularToken, tokenInstanceofMatcher)
// defineRecognizerSpecs("Lazy Tokens Mode", extendLazyToken, createLazyToken, tokenInstanceofMatcher)
// defineRecognizerSpecs("Simple Lazy Tokens Mode", extendSimpleLazyToken, createSimpleToken, tokenStructuredMatcher)
