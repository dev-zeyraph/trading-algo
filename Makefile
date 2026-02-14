CXX = clang++
CXXFLAGS = -O3 -Wall -fPIC -std=c++11 -march=native
INCLUDES = -Isrc_cpp

all: ocaml ui

src_cpp/kernel_stubs.o: src_cpp/kernel_stubs.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

src_cpp/sabr_kernel.o: src_cpp/sabr_kernel.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

src_cpp/neural_calib.o: src_cpp/neural_calib.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

libquant_kernel_stubs.a: src_cpp/kernel_stubs.o src_cpp/sabr_kernel.o src_cpp/neural_calib.o
	ar rcs $@ $^

ocaml: libquant_kernel_stubs.a
	@if command -v dune >/dev/null 2>&1; then \
		eval $$(opam env) && dune build; \
	else \
		echo "Dune not found, skipping OCaml build"; \
	fi

ui:
	@if command -v npm >/dev/null 2>&1; then \
		cd ui && npm install; \
	else \
		echo "NPM not found, skipping UI install"; \
	fi

run: ocaml
	eval $$(opam env) && dune exec bin/main.exe

clean:
	rm -f src_cpp/*.o *.a
	dune clean

.PHONY: all ocaml ui clean run
